import { CONST } from "../CONST";
import { expect, type Frame, type Page } from "../fixtures/playwright";
import { findFoblesFrame } from "../helpers/frame-finder";

export async function expectJumpFlyoutFlyoutVisible(foblesFrame: Frame) {
  const jumpFlyout = foblesFrame.locator(CONST.FOBLES.SELECTORS.JUMP_FLYOUT).first();
  await expect(jumpFlyout).toHaveAttribute(CONST.FOBLES.ATTRIBUTES.DATA_VISIBLE, "true");
}

export async function expectJumpFlyoutFlyoutHidden(foblesFrame: Frame) {
  const jumpFlyout = foblesFrame.locator(CONST.FOBLES.SELECTORS.JUMP_FLYOUT).first();
  await expect(jumpFlyout).toHaveAttribute(CONST.FOBLES.ATTRIBUTES.DATA_VISIBLE, "false");
}

export function expectCurrentUrlContains(page: Page, path: string) {
  const actualUrl = page.url();
  expect(actualUrl, `Expected current URL to contain ${path}`)
    .toContain(encodeURI(path)
    );
  console.log(
    `[fobles] URL assertion: expected to contain ${path}; actual ${actualUrl}`
  );
}

export async function expectLBoltButton(foblesFrame: Frame) {
  const lboltButton = foblesFrame.locator(CONST.FOBLES.SELECTORS.LBOLT_BUTTON).first();
  await expect(lboltButton).toBeVisible();
}

export async function expectFoblesContainerVisible(page: Page) {
  const foblesFrame = await findFoblesFrame(page);
  const container = foblesFrame.locator(CONST.FOBLES.SELECTORS.TOOLBAR_CONTAINER).first();
  await expect(container).toBeVisible();
}

export async function expectFoblesContainerDom(page: Page, position: string) {
  const foblesFrame = await findFoblesFrame(page);
  const container = foblesFrame.locator(CONST.FOBLES.SELECTORS.TOOLBAR_CONTAINER).first();
  await expect(container).toBeVisible();
  await expect(container).not.toHaveClass(/fobles-toolbar-dragging/);
  await expect(container).toHaveAttribute("data-position", position);
}
