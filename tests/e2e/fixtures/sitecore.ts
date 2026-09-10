import { expect, type Page } from "@playwright/test";
import { CONST } from "../CONST";
import { getTestEnvironment } from "./environment";
import { testLogger } from "../../testLogger";

async function ensureAuthenticatedUrl(page: Page): Promise<void> {
  const currentUrl = page.url();
  const displayUrl = (() => {
    try {
      const parsed = new URL(currentUrl);
      return `${parsed.origin}${parsed.pathname}`;
    } catch {
      return currentUrl;
    }
  })();
  testLogger.waitFor(
    `Fobles menu after login at ${displayUrl}`,
    CONST.TIMEOUTS.DISCOVERY_MS,
  );
  try {
    await expect
      .poll(
        async () => {
          for (const frame of page.frames()) {
            if (
              (await frame
                .locator(CONST.SITECORE.SELECTORS.MENU_TRIGGER)
                .count()) > 0
            ) {
              testLogger.info(`Login succeeded; Fobles menu found in frame ${frame.url()}`);
              return true;
            }
          }
          return false;
        },
        {
          timeout: CONST.TIMEOUTS.DISCOVERY_MS,
          message: `Waiting for the Fobles menu to appear at ${displayUrl}`,
        },
      )
      .toBe(true);
  } catch (error) {
    testLogger.error("Fobles menu wait failed", {
      pageUrl: page.url(),
      frameUrls: page.frames().map((frame) => frame.url()),
      timeoutMs: CONST.TIMEOUTS.DISCOVERY_MS,
      reason: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export async function openSitecorePage(page: Page, path = ""): Promise<void> {
  const { baseUrl } = getTestEnvironment();
  const url = new URL(path || baseUrl, baseUrl).toString();
  testLogger.step(`Navigate to ${url}`);
  await page.goto(url, { waitUntil: "domcontentloaded" });
  testLogger.info(`Navigation reached ${page.url()}`);
  await ensureAuthenticatedUrl(page);
}

export async function enableFobles(page: Page): Promise<void> {
  const menuTrigger = page
    .locator(CONST.SITECORE.SELECTORS.QUICK_MENU_TRIGGER)
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
