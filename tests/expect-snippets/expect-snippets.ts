import { TEST_CONST } from "../constants/TEST_CONST";
import { expect, type Frame, type Page } from "../fixtures/playwright";
import { getScSearchParams, normalizeFoValueForCompare, normalizePath } from "../helpers/path-helpers";
import { findFoblesFrame } from "../helpers/frame-finder";
import { locateJumpFlyout, locateJumpFlyoutTrigger } from "../helpers/locator-helpers";

export async function expectJumpFlyoutFlyoutVisible(page: Page) {
  //const jumpFlyout = foblesFrame.locator(TEST_CONST.FOBLES.SELECTORS.JUMP_FLYOUT).first();
  const jumpFlyout = (await locateJumpFlyout(page))

  const attributes = await jumpFlyout.evaluate((element) =>
    Object.fromEntries(Array.from(element.attributes, ({ name, value }) => [name, value])),
  );
  await expect(jumpFlyout).toHaveAttribute(TEST_CONST.FOBLES.ATTRIBUTES.DATA_VISIBLE, "true");
}

export async function expectJumpFlyoutFlyoutHidden(page: Page) {
  //  const jumpFlyout = foblesFrame.locator(TEST_CONST.FOBLES.SELECTORS.JUMP_FLYOUT).first();
  const jumpFlyoutTrigger = await locateJumpFlyoutTrigger(page);
  await expect(jumpFlyoutTrigger).toHaveAttribute(TEST_CONST.FOBLES.ATTRIBUTES.DATA_VISIBLE, "false");
}

export function expectFoValue(page: Page, expectedFoValue: string) {
  const scSearchParams = getScSearchParams(new URL(page.url()));
  const actualFoValue = scSearchParams.fo ?? "";
  expect(
    normalizeFoValueForCompare(actualFoValue),
    `Expected fo value to be ${normalizeFoValueForCompare(expectedFoValue)}`,
  ).toBe(normalizeFoValueForCompare(expectedFoValue));
}

export function expectCurrentUrlContains(page: Page, path: string) {
  const actualUrl = normalizePath(page.url());
  const normalizedPath = normalizePath(path);
  expect(actualUrl, `Expected current URL to contain ${normalizedPath}`).toContain(normalizedPath);
  console.log(`[fobles] URL assertion: expected to contain ${normalizedPath}; actual ${actualUrl}`);
}

export async function expectLBoltButton(foblesFrame: Frame) {
  const lboltButton = foblesFrame.locator(TEST_CONST.FOBLES.SELECTORS.LBOLT_BUTTON).first();
  await expect(lboltButton).toBeVisible();
}

export async function expectFoblesContainerVisible(page: Page) {
  const foblesFrame = await findFoblesFrame(page);
  const container = foblesFrame.locator(TEST_CONST.FOBLES.SELECTORS.TOOLBAR_CONTAINER).first();
  await expect(container).toBeVisible();
}

export async function expectStaticToolbarPosition(page: Page, position: string) {
  const foblesFrame = await findFoblesFrame(page);
  const container = foblesFrame.locator(TEST_CONST.FOBLES.SELECTORS.TOOLBAR_CONTAINER).first();
  await expect(container).toBeVisible();
  await expect(container).not.toHaveClass(/fobles-toolbar-dragging/);
  await expect(container).toHaveAttribute(TEST_CONST.FOBLES.ATTRIBUTES.DATA_POSITION, position);
}
