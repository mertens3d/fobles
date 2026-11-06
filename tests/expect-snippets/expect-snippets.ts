import { TEST_CONST } from "../constants/TEST_CONST";
import { expect, type Frame, type Page } from "../fixtures/playwright";
import { getScSearchParams, normalizeFoValueForCompare, normalizePath } from "../helpers/path-helpers";
import { locateJumpFlyout, locateLBoltButton, locateToolbarContainer } from "../helpers/locator-helpers";

export async function expectJumpFlyoutFlyoutVisible(page: Page) {
  const jumpFlyout = (await locateJumpFlyout(page))
  await expect(jumpFlyout).toHaveAttribute(TEST_CONST.FOBLES.ATTRIBUTES.DATA_VISIBLE, "true");
}

export async function expectJumpFlyoutFlyoutHidden(page: Page) {
  const jumpFlyout = await locateJumpFlyout(page);
  await expect(jumpFlyout).toHaveAttribute(TEST_CONST.FOBLES.ATTRIBUTES.DATA_VISIBLE, "false");
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

export async function expectLBoltButtonVisible(page: Page) {
  const lboltButton = await locateLBoltButton(page);
  await expect(lboltButton).toBeVisible();
}

export async function expectFoblesContainerVisible(page: Page) {
  const container = await locateToolbarContainer(page);
  await expect(container).toBeVisible();
}

export async function expectStaticToolbarPosition(page: Page, position: string) {
  const container = await locateToolbarContainer(page);
  await expect(container).toBeVisible();
  await expect(container).not.toHaveClass(/fobles-toolbar-dragging/);
  await expect(container).toHaveAttribute(TEST_CONST.FOBLES.ATTRIBUTES.DATA_POSITION, position);
}
