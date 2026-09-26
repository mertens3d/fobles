import { expect, type Page } from "@playwright/test";
import { CONST } from "../CONST";
import { getTestEnvironment } from "./environment";
import { logDiagnostic } from "./logging";
import { ensureAuthenticatedUrl } from "./autoLogin";



// Sitecore's Content Editor "View > Raw Values" ribbon toggle is a persisted per-session setting,
// not something tied to the current page - if a prior manual session left it on, every field
// renders as a plain text box with its raw stored value (GUIDs, XML) instead of its real widget
// (select, multilist, etc.), which looks exactly like a timing/race failure but isn't one. Mirrors
// src/content/toolbar/proxy-buttons.ts's real ribbon checkbox id for this same toggle.
const RAW_VALUES_CHECKBOX_ID = "Check_BBDED3F008D144C82A983B54F0424BBC1";

async function ensureRawValuesDisabled(page: Page): Promise<void> {
  for (const frame of page.frames()) {
    const wasDisabled = await frame
      .evaluate((checkboxId) => {
        const checkbox = document.getElementById(checkboxId) as HTMLInputElement | null;
        if (!checkbox?.checked) return null;
        checkbox.click();
        return true;
      }, RAW_VALUES_CHECKBOX_ID)
      .catch(() => null);

    if (wasDisabled) {
      console.log(`[sitecore preflight] Raw Values was on - clicked it off`);
      await page.waitForTimeout(1_000);
      return;
    }
  }
}

export async function openSitecorePage(page: Page, path = ""): Promise<void> {
  const { baseUrl } = getTestEnvironment();
  const url = new URL(path || baseUrl, baseUrl).toString();
  // page.goto() issues a CDP Page.navigate command from outside the page - Chromium tags it as a
  // browser-initiated navigation with no referrer and no user-gesture context. The real extension
  // always navigates via window.location.assign() from inside a button's onclick (helper.ts's
  // openFoblesUrl) - a renderer-initiated navigation with a real referrer and gesture context.
  // Match that here in case IdentityServer's session/silent-renewal handling is sensitive to it.
  // Must await the navigation before waitForLoadState, not race them with Promise.all - racing
  // lets waitForLoadState resolve instantly against the pre-navigation document (e.g. about:blank,
  // which is already "domcontentloaded"), so downstream login/menu checks run too early and never
  // see the real page.
  await page
    .evaluate((targetUrl) => {
      window.location.assign(targetUrl);
    }, url)
    .catch(() => {
      // Navigating away can destroy the execution context mid-evaluate - expected, ignore.
    });
  await page.waitForLoadState("domcontentloaded");
  await ensureAuthenticatedUrl(page);
  await ensureRawValuesDisabled(page);
}

// Used both by the worker-teardown cleanup and the final "IsLoggedOut" test - returns whether a
// logout link was actually found and clicked, since callers need to tell a real logout apart from
// a page that simply had no visible link (already logged out, wrong page, etc.).
export async function logoutCurrentSitecoreSession(page: Page): Promise<boolean> {
  for (const frame of page.frames()) {
    try {
      // Sitecore renders "Log out" as plain text inside a <li> (ul.sc-accountInformation), not a
      // semantic <a> - getByRole("link") never matches it, regardless of how it looks visually.
      const logout = frame
        .locator(CONST.SITECORE.SELECTORS.ACCOUNT_INFO)
        .getByText(/log\s*out/i)
        .first();
      if (await logout.isVisible()) {
        await logout.click();
        return true;
      }
    } catch {
      // The frame may be navigating/closing.
    }
  }
  return false;
}

export async function enableFobles(page: Page): Promise<void> {
  const menuTrigger = page
    .locator(CONST.SITECORE.SELECTORS.MENU_TRIGGER)
    .first();
  await expect(menuTrigger).toBeVisible({
    timeout: CONST.TIMEOUTS.MENU_TRIGGER_VISIBLE_MS,
  });
  await menuTrigger.click();

  const menu = page.locator(CONST.SITECORE.SELECTORS.QUICK_MENU).first();
  await expect(menu).toBeVisible({ timeout: CONST.TIMEOUTS.MENU_VISIBLE_MS });

  const toggle = page
    .getByRole("button", { name: CONST.SITECORE.LABELS.TOGGLE_FOBLES })
    .first();
  if (await toggle.isVisible().catch(() => false)) {
    await toggle.click();
  }
}

export async function openFoblesMenu(page: Page): Promise<void> {
  const trigger = page.locator(CONST.SITECORE.SELECTORS.MENU_TRIGGER).first();

  await page.waitForLoadState("domcontentloaded");
  await expect
    .poll(async () => await trigger.count(), {
      timeout: CONST.TIMEOUTS.MENU_TRIGGER_VISIBLE_MS,
    })
    .toBeGreaterThan(0);

  await trigger.scrollIntoViewIfNeeded();
  await trigger.hover();
  await trigger.click();

  const menu = page.locator(CONST.SITECORE.SELECTORS.QUICK_MENU).first();
  await expect(menu).toBeVisible({ timeout: CONST.TIMEOUTS.MENU_VISIBLE_MS });
}
