import { expect, type Page } from "@playwright/test";
import { getActiveTestUserCredentials, getTestEnvironment } from "./environment";
import { logDiagnostic } from "./logging";
import type { AutoLoginContext } from "./auto-login.types";
import { CONST } from "../CONST";

function toDisplayUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return url;
  }
}

// Sitecore redirects here when every concurrent-user license slot is taken - no point waiting out
// the full discovery timeout on that page, or on any later test's page, since nothing will recover
// until a slot frees up. Once seen, fail every remaining test in this run immediately instead of
// each one separately timing out.
let licenseExhausted = false;

function assertLicenseAvailable(page: Page): void {
  const licenseMessage =
    "Sitecore redirected to the License Options start page - every concurrent-user license slot " +
    "is taken. Free one up (Kick User) before running more tests; there's no value in continuing " +
    "until a slot is available.";

  if (licenseExhausted) throw new Error(licenseMessage);

  if (page.url().includes(CONST.SITECORE.PATHS.LICENSE_STARTPAGE)) {
    licenseExhausted = true;
    throw new Error(licenseMessage);
  }
}

// Sitecore Identity Server's login form (identityserver/Account/Login) - a plain HTML form POST,
// not a SPA, so a fill + click is enough. Absent on any other login variant (e.g. /sitecore/admin/
// login.aspx), so attemptAutoLogin harmlessly no-ops there and falls back to the manual wait.
const XP_LOGIN_SELECTORS = {
  USERNAME: "#Username",
  PASSWORD: "#Password",
  SUBMIT: "button[value='login']",
};

// SitecoreAI's Auth0 Universal Login - two separate page navigations (identifier, then password),
// unlike xp's single-page form. "_button-login-id"/"_button-login-password" are Auth0's stable
// hook classes (the other hashed "c..." classes are regenerated per deploy).
const AI_LOGIN_SELECTORS = {
  USERNAME: "#username",
  USERNAME_SUBMIT: "._button-login-id",
  PASSWORD: "#password",
  PASSWORD_SUBMIT: "._button-login-password",
};

// Only runs when the active environment's fobles.environments.json testUser resolves both a
// username and password (literal or via the secure secret store) - without them, behavior is
// unchanged from the manual-login banner below.
async function attemptAutoLogin(page: Page): Promise<boolean> {
  const { username, password } = getActiveTestUserCredentials();
  const autoLoginContext: AutoLoginContext = {
    username: username?.trim(),
    password,
  };

  console.log(
    `[sitecore preflight] test user credentials ${autoLoginContext.username && autoLoginContext.password ? "found" : "not found"}`,
  );

  if (getTestEnvironment().version === "ai") {
    return attemptAiAutoLogin(page, autoLoginContext);
  }

  const success = await fillXpUsername(page, autoLoginContext);
  if (success) {
    await fillXpPassword(page, autoLoginContext);
  }

  return true;
}

async function attemptAiAutoLogin(
  page: Page,
  autoLoginContext: AutoLoginContext,
): Promise<boolean> {
  const { username, password } = autoLoginContext;
  if (!username || !password) return false;

  const usernameField = page.locator(AI_LOGIN_SELECTORS.USERNAME);
  if ((await usernameField.count()) > 0) {
    console.log(
      "[sitecore preflight] SitecoreAI identifier screen detected - submitting test username",
    );
    await usernameField.fill(username);
    await page.locator(AI_LOGIN_SELECTORS.USERNAME_SUBMIT).click();
    await page
      .locator(AI_LOGIN_SELECTORS.PASSWORD)
      .waitFor({ state: "attached", timeout: CONST.TESTING.TIMEOUTS.AUTO_LOGIN_WAIT_MS })
      .catch(() => {});
  }

  const passwordField = page.locator(AI_LOGIN_SELECTORS.PASSWORD);
  if ((await passwordField.count()) === 0) return false;

  console.log(
    "[sitecore preflight] SitecoreAI password screen detected - submitting test password",
  );
  await passwordField.fill(password.reveal());
  await page.locator(AI_LOGIN_SELECTORS.PASSWORD_SUBMIT).click();
  return true;
}

async function fillXpPassword(
  page: Page,
  autoLoginContext: AutoLoginContext,
): Promise<void> {
  const password = autoLoginContext.password;
  if (password) {
    await page.locator(XP_LOGIN_SELECTORS.PASSWORD).fill(password.reveal());
    await page.locator(XP_LOGIN_SELECTORS.SUBMIT).click();
  }
}

async function fillXpUsername(
  page: Page,
  autoLoginContext: AutoLoginContext,
): Promise<boolean> {
  const username = autoLoginContext.username;
  let success = true;
  if (username) {
    const usernameField = page.locator(XP_LOGIN_SELECTORS.USERNAME);
    if ((await usernameField.count()) > 0) {
      console.log(
        "[sitecore preflight] Login form detected - submitting test username/password",
      );
      await usernameField.fill(username);
    } else {
      success = false;
    }
  } else {
    success = false;
  }
  return success;
}

// A password field means Sitecore redirected to login instead of the requested page. Sitecore's
// auth cookies appear to be session-only, so they never survive closing the browser between a
// separate login step and the actual test run - the only thing that works is staying logged in
// within the same still-running browser. Poll for the login form to disappear (rather than
// page.pause()) so you can just log in by hand and continue - page.pause() attaches the Playwright
// Inspector, which then keeps highlighting every later locator/action for the rest of the run.
async function assertLoggedIn(page: Page): Promise<void> {
  // "input[type='password']" covers both xp's single-page form and the SitecoreAI password page;
  // AI_LOGIN_SELECTORS.USERNAME additionally covers the SitecoreAI identifier page, which has no
  // password field at all yet.
  const loginForm = page
    .locator(`input[type='password'], ${AI_LOGIN_SELECTORS.USERNAME}`)
    .first();
  const loginFormPresent = await loginForm
    .waitFor({
      state: "attached",
      timeout: CONST.TESTING.TIMEOUTS.LOGIN_FORM_DETECT_MS,
    })
    .then(() => true)
    .catch(() => false);
  if (!loginFormPresent) return;

  if (await attemptAutoLogin(page)) {
    try {
      await expect(loginForm).toHaveCount(0, {
        timeout: CONST.TESTING.TIMEOUTS.AUTO_LOGIN_WAIT_MS,
      });
      return;
    } catch {
      console.log(
        "[sitecore preflight] Automatic login did not complete - falling back to the manual login wait",
      );
    }
  }

  // Interleaved browser console/network noise buries a plain console.warn - use a banner so it's
  // unmistakable even scrolling past dozens of unrelated log lines. The full URL (OAuth query
  // string included) is hundreds of characters - trim to origin+pathname to keep the banner short.

  printBanner(page);
  // The initial print scrolls out of view under later console/network noise while the browser
  // sits open waiting for you - repeat it periodically so it resurfaces.
  const reprintInterval = setInterval(() => printBanner(page), 20_000);
  try {
    await expect(loginForm).toHaveCount(0, {
      timeout: CONST.TESTING.TIMEOUTS.LOGIN_WAIT_MS,
    });
  } finally {
    clearInterval(reprintInterval);
  }
}

const printBanner = (page: Page) => {
  const PAUSE_BANNER = "=".repeat(70);
  // Amber background, black text - ANSI SGR codes, reset at the end of each colored line.
  const ANSI_AMBER = "\x1b[43m\x1b[30m";
  const ANSI_RESET = "\x1b[0m";

  logDiagnostic(
    `\n${ANSI_AMBER}${PAUSE_BANNER}${ANSI_RESET}\n${ANSI_AMBER}LOGIN NEEDED at ${toDisplayUrl(page.url())}${ANSI_RESET}\n${ANSI_AMBER}Log in manually in the browser window - this check continues automatically once you're logged in.${ANSI_RESET}\n${ANSI_AMBER}${PAUSE_BANNER}${ANSI_RESET}\n`,
  );
};

export async function ensureAuthenticatedUrl(page: Page): Promise<void> {
  assertLicenseAvailable(page);
  await assertLoggedIn(page);
  assertLicenseAvailable(page);

  const startedAt = Date.now();
  const initialUrl = toDisplayUrl(page.url());
  console.log(
    `[sitecore preflight] Waiting for the Fobles flyout (${CONST.FOBLES.SELECTORS.JUMP_MENU_TRIGGER}) to appear - started at: ${initialUrl}`,
  );

  // A one-off "waiting for X" message is useless once the wait actually stalls - log elapsed time
  // and the current URL on every poll tick, so a stall shows exactly how long it's been and
  // whether the browser is silently redirecting/retrying (URL changing) or genuinely frozen.
  let lastLoggedUrl = initialUrl;
  try {
    await expect
      .poll(
        async () => {
          assertLicenseAvailable(page);
          const elapsedMs = Date.now() - startedAt;
          const currentUrl = toDisplayUrl(page.url());
          if (currentUrl !== lastLoggedUrl) {
            console.log(
              `[sitecore preflight] (${elapsedMs}ms) URL changed to: ${currentUrl}`,
            );
            lastLoggedUrl = currentUrl;
          } else {
            console.log(
              `[sitecore preflight] (${elapsedMs}ms) still waiting at: ${currentUrl}`,
            );
          }

          for (const frame of page.frames()) {
            if (
              (await frame
                .locator(CONST.FOBLES.SELECTORS.JUMP_MENU_TRIGGER)
                .count()) > 0
            ) {
              console.log(
                `[sitecore preflight] (${elapsedMs}ms) Fobles flyout found.`,
              );
              return true;
            }
          }
          return false;
        },
        {
          timeout: CONST.TESTING.TIMEOUTS.DISCOVERY_MS,
          intervals: [1_000],
          message: `Waiting for the Fobles flyout to appear (started at ${initialUrl})`,
        },
      )
      .toBe(true);
  } catch (error) {
    const elapsedMs = Date.now() - startedAt;
    logDiagnostic(
      `[sitecore preflight] page timed out after ${elapsedMs}ms waiting for the Fobles flyout - last seen at: ${toDisplayUrl(page.url())}`,
    );
    throw error;
  }
}
