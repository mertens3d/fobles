import { CONST } from "../CONST";
import { expect, type Frame, type Page } from "../fixtures/playwright";
import { getScSearchParams, normalizeFoValueForCompare, normalizePath } from "../helpers/path-helpers";
import { findFoblesFrame } from "../helpers/frame-finder";

export async function expectJumpFlyoutFlyoutVisible(foblesFrame: Frame) {
  const jumpFlyout = foblesFrame.locator(CONST.FOBLES.SELECTORS.JUMP_FLYOUT).first();
  await expect(jumpFlyout).toHaveAttribute(CONST.FOBLES.ATTRIBUTES.DATA_VISIBLE, "true");
}

export async function expectJumpFlyoutFlyoutHidden(foblesFrame: Frame) {
  const jumpFlyout = foblesFrame.locator(CONST.FOBLES.SELECTORS.JUMP_FLYOUT).first();
  await expect(jumpFlyout).toHaveAttribute(CONST.FOBLES.ATTRIBUTES.DATA_VISIBLE, "false");
}

export function expectFoValue(page: Page, expectedFoValue: string) {
  const scSearchParams = getScSearchParams(new URL(page.url()));
  const actualFoValue = scSearchParams.fo ?? "";
  expect(normalizeFoValueForCompare(actualFoValue), `Expected fo value to be ${normalizeFoValueForCompare(expectedFoValue)}`)
    .toBe(normalizeFoValueForCompare(expectedFoValue));
}

export function expectCurrentUrlContains(page: Page, path: string) {
  const actualUrl = normalizePath(page.url());
  const normalizedPath = normalizePath(path);
  expect(actualUrl, `Expected current URL to contain ${normalizedPath}`)
    .toContain(normalizedPath);
  console.log(
    `[fobles] URL assertion: expected to contain ${normalizedPath}; actual ${actualUrl}`
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
