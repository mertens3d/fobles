import { CONST } from "../CONST";
import { expect, type Frame, type Page } from "../fixtures/playwright";

export async function expectFlyoutVisible(foblesFrame: Frame) {
    const menuFlyout = foblesFrame.locator(CONST.SITECORE.SELECTORS.QUICK_MENU).first();
    await expect(menuFlyout).toHaveAttribute(CONST.SITECORE.ATTRIBUTES.MENU_VISIBLE, "true");
}

export function expectCurrentUrl(page: Page, path: string) {
  const actualUrl = page.url();
  expect(actualUrl, `Expected current URL to contain ${path}`).toContain(
    encodeURI(path)
  );
  console.log(
    `[fobles] URL assertion: expected to contain ${path}; actual ${actualUrl}`
  );
}

export async function expectLBoltButton(foblesFrame: Frame) {
    const lboltButton = foblesFrame.locator(CONST.SITECORE.SELECTORS.LBOLT_BUTTON).first();
    await expect(lboltButton).toBeVisible();
}
