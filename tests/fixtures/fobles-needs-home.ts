import { type Page, expect } from "@playwright/test";
import { TEST_CONST } from "../constants/TEST_CONST";
import { locateJumpFlyout } from "../helpers/locator-helpers";

export async function openFoblesJumpFlyout(page: Page): Promise<void> {
  const jumpFlyoutTrigger = page.locator(TEST_CONST.FOBLES.SELECTORS.JUMP_FLYOUT_TRIGGER).first();

  await page.waitForLoadState("domcontentloaded");
  await expect
    .poll(async () => await jumpFlyoutTrigger.count(), { timeout: TEST_CONST.TESTING.TIMEOUTS.MENU_TRIGGER_VISIBLE_MS })
    .toBeGreaterThan(0);

  await jumpFlyoutTrigger.scrollIntoViewIfNeeded();
  await jumpFlyoutTrigger.hover();
  await jumpFlyoutTrigger.click();

  const jumpFlyout = await locateJumpFlyout(page);
  await expect(jumpFlyout).toBeVisible({ timeout: TEST_CONST.TESTING.TIMEOUTS.MENU_VISIBLE_MS });
}

export async function enableFobles(page: Page): Promise<void> {
  const jumpFlyoutTrigger = page.locator(TEST_CONST.FOBLES.SELECTORS.JUMP_FLYOUT_TRIGGER).first();
  await expect(jumpFlyoutTrigger).toBeVisible({ timeout: TEST_CONST.TESTING.TIMEOUTS.MENU_TRIGGER_VISIBLE_MS });

  await openFoblesJumpFlyout(page);

  const jumpFlyout = await locateJumpFlyout(page);
  await expect(jumpFlyout).toBeVisible({ timeout: TEST_CONST.TESTING.TIMEOUTS.MENU_VISIBLE_MS });

  const toggle = page.getByRole("button", { name: TEST_CONST.FOBLES.LABELS.TOGGLE_FOBLES }).first();
  if (await toggle.isVisible().catch(() => false)) {
    await toggle.click();
  }
}
