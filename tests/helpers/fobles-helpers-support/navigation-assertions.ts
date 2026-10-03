import { expect, type Locator, type Page, type TestInfo } from "@playwright/test";
import { CONST } from "../../CONST";
import { clickWithMouseMarker, highlightClickTarget } from "../mouse-proxy";
import { clickContentTabIfPresent } from "../../macros/sitecore-macros";
import { dismissFoblesConfirmDialogIfPresent } from "../../macros/fobles-macros";
import { findFrameWithSelector } from "../frame-finder";
import { bringPageToFront } from "../page-switch";
import type { StrategyTestContext } from "../../e2e/strategies/support/scenario.types";
import { attachLocatorScreenshot } from "./screenshots";
import { buildStepMatchKey } from "./step-match-key";

// Sitecore's own "fo" query param is either a bare GUID (braces stripped by Fobles'
// normalizeFoblesValue before building the URL) or a content path (e.g.
// "/sitecore/system/Modules/Fobles Testing") - callers may still pass a braced GUID (matching how
// it's usually written in test constants), so strip braces unconditionally; a plain path is
// unaffected since it never contains any.
function normalizeFoValueForCompare(value: string): string {
  return value.replace(/[{}]/g, "").toUpperCase();
}

function assertFoblesTargetUrl(
  actualUrl: string,
  expectedFoValue: string,
): void {
  const url = new URL(actualUrl);
  expect(decodeURIComponent(url.pathname)).toBe(
    CONST.SITECORE.PATHS.CONTENT_EDITOR_BW.split("?")[0],
  );
  expect(
    url.searchParams.get("fo")
      ? normalizeFoValueForCompare(url.searchParams.get("fo")!)
      : null,
  ).toBe(normalizeFoValueForCompare(expectedFoValue));
}

// Named after matchKey - the enclosing step's own full title - rather than expectedFoValue,
// since two different steps in the same test (e.g. Ctrl+click and a later plain click) can share
// the identical expectedFoValue; naming after the shared value would make the reporter's
// suffix-based step matching attach both notes to whichever step it visits first and leave the
// other with none. Attached before the assertion runs so it still shows up if that assertion then
// throws.
async function attachActualFoValueNote(
  testInfo: TestInfo,
  expectedFoValue: string,
  actualUrl: string,
  matchKey: string,
): Promise<void> {
  const actualFo = new URL(actualUrl).searchParams.get("fo") ?? "(none)";
  const safeName = buildStepMatchKey(matchKey);
  await testInfo.attach(`actual-fo-${safeName}.txt`, {
    body: Buffer.from(`actual: fo=${actualFo}`),
    contentType: "text/plain",
  });
}

// Records the real click-path a user would take to reach the page under test (e.g. "CE -> Navigate
// -> Links") - a bare relative URL alone doesn't say how you'd actually get there through the UI,
// especially for tests that navigate straight to a URL instead of clicking through it. matchKey -
// see attachActualFoValueNote.
export async function attachUiPathNote(
  testInfo: TestInfo,
  uiPath: string,
  matchKey: string,
): Promise<void> {
  const safeName = buildStepMatchKey(matchKey);
  await testInfo.attach(`ui-path-${safeName}.txt`, {
    body: Buffer.from(`ui path: ${uiPath}`),
    contentType: "text/plain",
  });
}

// A Fobles item button's plain click navigates the current tab - Sitecore's own eligibility is
// not our concern (per AGENTS.md scope: Fobles' job ends at sending the right URL), so this only
// asserts the URL we land on, not what Content Editor does with it. Fobles shows a same-tab
// navigation confirmation dialog by default (fresh profile, FOBLES_NAV_WARNING_VISIBLE defaults to
// true) - click through it if it appears. expectedFoValue is whatever the "fo" query param should
// be - a bare GUID for most strategies, or a content path for Internal Link. stepTitle must be the
// exact title of the enclosing step (see attachActualFoValueNote) so the report attaches this call's
// note/screenshot to the right step even when another step in the same test shares expectedFoValue.
// Also attaches a Quick Info "Item path" screenshot of the landed-on item, for visual confirmation
// alongside the URL assertion.
export async function expectFoblesButtonSameTabNavigation(
  page: Page,
  testInfo: TestInfo,
  button: Locator,
  expectedFoValue: string,
  stepTitle: string,
): Promise<void> {
  await clickWithMouseMarker(page, button, "Fobles item button");

  await dismissFoblesConfirmDialogIfPresent(page, { turnOffWarning: true });

  await page.waitForURL((url:URL) => url.searchParams.has("fo"));
  
  await attachActualFoValueNote(
    testInfo,
    expectedFoValue,
    page.url(),
    stepTitle,
  );
  assertFoblesTargetUrl(page.url(), expectedFoValue);
  await attachItemPathScreenshot(page, testInfo, stepTitle);
}

// A Fobles item button's Ctrl/Cmd-click opens the target in a new tab, leaving the current page
// untouched - verify the popup's URL, then close it without disturbing the rest of the test.
// stepTitle - see expectFoblesButtonSameTabNavigation. Also attaches a Quick Info "Item path"
// screenshot of the popup before closing it.
export async function expectFoblesButtonNewTabNavigationStrategy(
  testContext: StrategyTestContext,
  stepTitle: string,
  popup: Page,
): Promise<void> {
  // console.log(`expectFoblesButtonNewTabNavigation s)`);

  // await popup.bringToFront();

  // await popup.waitForLoadState("domcontentloaded");
  // await attachActualFoValueNote(
  //   testContext.testInfo,
  //   testContext.SCENARIO.expectedFoValue,
  //   popup.url(),
  //   stepTitle,
  // );
  // assertFoblesTargetUrl(popup.url(), testContext.SCENARIO.expectedFoValue);
  // await attachItemPathScreenshot(popup, testContext.testInfo, stepTitle);

  // const newTabHoldMs =
  //   CONST.TESTING.SPEED.SETTINGS[CONST.TESTING.SPEED.SELECTED].STEP_WAIT_MS *
  //   CONST.TESTING.NAVIGATION.NEW_TAB_HOLD_MULTIPLIER;
  // await popup.waitForTimeout(newTabHoldMs);
  // await testContext.page.bringToFront();

  // await popup.close();

await expectFoblesButtonNewTabNavigation(
  testContext.testInfo,
  testContext.SCENARIO.expectedFoValue,
  stepTitle,
  popup,
  testContext.page,
);


}


export async function expectFoblesButtonNewTabNavigation(
  testInfo: TestInfo,
  expectedFoValue: string,
  stepTitle: string,
  popup: Page,
  owningPage: Page,
): Promise<void> {
  console.log(`expectFoblesButtonNewTabNavigation s)`);

  const newTabHoldMs =
    CONST.TESTING.SPEED.SETTINGS[CONST.TESTING.SPEED.SELECTED].STEP_WAIT_MS *
    CONST.TESTING.NAVIGATION.NEW_TAB_HOLD_MULTIPLIER;
  await bringPageToFront(popup, newTabHoldMs);

  await popup.waitForLoadState("domcontentloaded");
  await attachActualFoValueNote(
    testInfo,
    expectedFoValue,
    popup.url(),
    stepTitle,
  );
  assertFoblesTargetUrl(popup.url(), expectedFoValue);
  await attachItemPathScreenshot(popup, testInfo, stepTitle);

  await bringPageToFront(owningPage);

  await popup.close();
}

// Screenshots just the "Item path" row of Content Editor's quick-info panel (switching to the
// Content tab first if needed) - shows which item a jump landed on without the full-page noise,
// and without the Item owner row a whole-quick-info screenshot would also expose. matchKey should
// be the enclosing step's own full title (see attachActualFoValueNote) so this screenshot attaches
// to the right step even when another step in the same test targets the same item/value.
export async function attachItemPathScreenshot(
  page: Page,
  testInfo: TestInfo,
  matchKey: string,
): Promise<void> {
  await clickContentTabIfPresent(page);

  const frame = await findFrameWithSelector(
    page,
    CONST.SITECORE.SELECTORS.CONTENT_TAB,
    "Content Editor tab header",
  );
  const itemPathRow :Locator = frame
    .locator(`${CONST.SITECORE.SELECTORS.QUICK_INFO_TABLE} tr`, {
      hasText: CONST.SITECORE.LABELS.ITEM_PATH,
    })
    .first();
  
  await highlightClickTarget(itemPathRow, "Item path row");
  await expect(itemPathRow).toBeVisible();
  const safeName = buildStepMatchKey(matchKey);
  await attachLocatorScreenshot(testInfo, itemPathRow, `item-path-${safeName}.png`);
}

// export async function attachFoblesButtonScreenshot(
//   page: Page,
//   testInfo: TestInfo,
//   locator: Locator,
// ): Promise<void> {

//   const frame = await findFrameWithSelector(
//     page,
//     CONST.SITECORE.SELECTORS.CONTENT_TAB,
//     "Content Editor tab header",
//   );
//   const itemPathRow :Locator = frame
//     .locator(`${CONST.SITECORE.SELECTORS.QUICK_INFO_TABLE} tr`, {
//       hasText: CONST.SITECORE.LABELS.ITEM_PATH,
//     })
//     .first();
  
//   await highlightClickTarget(itemPathRow, "Item path row");
//   await expect(itemPathRow).toBeVisible();
//   const safeName = buildStepMatchKey(matchKey);
//   await attachLocatorScreenshot(testInfo, itemPathRow, `item-path-${safeName}.png`);
// }
