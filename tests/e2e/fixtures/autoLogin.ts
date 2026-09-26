import { expect, type Page } from "@playwright/test";
import { CONST } from "../CONST";
import { getTestEnvironment } from "./environment";
import { logDiagnostic } from "./logging";
import type { AutoLoginContext } from "./autologin.type";

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
const LOGIN_SELECTORS = {
  USERNAME: "#Username",
  PASSWORD: "#Password",
  SUBMIT: "button[value='login']",
};

// Only runs when both SITECORE_TEST_USER_NAME/SITECORE_TEST_USER_PASSWORD are configured (see
// .env.example) - without them, behavior is unchanged from the manual-login banner below.
async function attemptAutoLogin(page: Page): Promise<boolean> {
  const autoLoginContext: AutoLoginContext = {
    username: process.env.SITECORE_TEST_USER_NAME?.trim(),
    password: process.env.SITECORE_TEST_USER_PASSWORD,
  };

  console.log(
    `[sitecore preflight] SITECORE_TEST_USER_NAME/SITECORE_TEST_USER_PASSWORD ${autoLoginContext.username && autoLoginContext.password ? "found" : "not found"}`,
  );

  let success = await fillUserName(page, autoLoginContext);
  if (success) {
    await fillPassword(page, autoLoginContext);
  }

  return true;
}

async function fillPassword(
  page: Page,
  autoLoginContext: AutoLoginContext,
): Promise<void> {
  const password = autoLoginContext.password;
  if (password) {
    await page.locator(LOGIN_SELECTORS.PASSWORD).fill(password);
    await page.locator(LOGIN_SELECTORS.SUBMIT).click();
  }
}

async function fillUserName(
  page: Page,
  autoLoginContext: AutoLoginContext,
): Promise<boolean> {
  const username = autoLoginContext.username;
  let success = true;
  if (username) {
    const usernameField = page.locator(LOGIN_SELECTORS.USERNAME);
    if ((await usernameField.count()) > 0) {
      console.log(
        "[sitecore preflight] Login form detected - submitting SITECORE_TEST_USER_NAME/SITECORE_TEST_USER_PASSWORD",
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
  const loginForm = page.locator("input[type='password']").first();
  const loginFormPresent = await loginForm
    .waitFor({
      state: "attached",
      timeout: CONST.TIMEOUTS.LOGIN_FORM_DETECT_MS,
    })
    .then(() => true)
    .catch(() => false);
  if (!loginFormPresent) return;

  if (await attemptAutoLogin(page)) {
    try {
      await expect(loginForm).toHaveCount(0, {
        timeout: CONST.TIMEOUTS.AUTO_LOGIN_WAIT_MS,
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

  printBanner();
  // The initial print scrolls out of view under later console/network noise while the browser
  // sits open waiting for you - repeat it periodically so it resurfaces.
  const reprintInterval = setInterval(printBanner, 20_000);
  try {
    await expect(loginForm).toHaveCount(0, {
      timeout: CONST.TIMEOUTS.LOGIN_WAIT_MS,
    });
  } finally {
    clearInterval(reprintInterval);
  }
}

const printBanner = () => {
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
    `[sitecore preflight] Waiting for the Fobles menu (${CONST.SITECORE.SELECTORS.MENU_TRIGGER}) to appear - started at: ${initialUrl}`,
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
                .locator(CONST.SITECORE.SELECTORS.MENU_TRIGGER)
                .count()) > 0
            ) {
              console.log(
                `[sitecore preflight] (${elapsedMs}ms) Fobles menu found.`,
              );
              return true;
            }
          }
          return false;
        },
        {
          timeout: CONST.TIMEOUTS.DISCOVERY_MS,
          intervals: [1_000],
          message: `Waiting for the Fobles menu to appear (started at ${initialUrl})`,
        },
      )
      .toBe(true);
  } catch (error) {
    const elapsedMs = Date.now() - startedAt;
    logDiagnostic(
      `[sitecore preflight] page timed out after ${elapsedMs}ms waiting for the Fobles menu - last seen at: ${toDisplayUrl(page.url())}`,
    );
    throw error;
  }
}
