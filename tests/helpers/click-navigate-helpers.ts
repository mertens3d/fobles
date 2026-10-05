import type { Page, Locator, TestInfo } from "../fixtures/playwright";
import { isContentEditor } from "./path-helpers";
import { CONST } from "../CONST";
import { clickWithMouseMarker, ensureMouseMarkerExists } from "./mouse-proxy";
import { getLastTwoPathItems } from "./path-helpers";
import { dismissFoblesConfirmDialogIfPresent } from "../macros/fobles-macros";
import { expectCurrentUrlContains as expectCurrentUrlContains } from "../expect-snippets/expect-snippets";
import { attachItemPathScreenshot } from "./fobles-helpers-support/navigation-assertions";
import { pauseForHuman } from "./wait-helpers";
import { ceRibbonOpenHome } from "../macros/sitecore-macros";
import {  attachPageScreenshot } from "./fobles-helpers-support/screenshots";
import type { BrowserContext } from "@playwright/test";
import { bringPageToFront } from "./page-switch";

import { buildStepMatchKey } from "./fobles-helpers-support/step-match-key";


// export async function ctrlClickFoblesNavigationButtonStep(page: Page, foblesButton: Locator, expectedUrlContainsPath: string, testInfo: TestInfo, sharedBrowserContext: BrowserContext, step: FoblesStep) {
//   await step(
//     `Ctrl-click navigation`,
//     async () => {
//       await ctrlClickFoblesNavigationButton(page, foblesButton, expectedUrlContainsPath, testInfo, sharedBrowserContext);
//     },
//     { timeout: CONST.TESTING.TIMEOUTS.STEP_TIMEOUT_MS }
//   );
// }
// export async function clickFoblesNavigationButtonStep(page: Page, foblesButton: Locator, expectedUrlContainsPath: string, testInfo: TestInfo, sharedBrowserContext: BrowserContext, step: FoblesStep) {

//   await step(
//     `Normal click navigation`,
//     async () => {
//       await normalClickFoblesNavigationButton(page, foblesButton, expectedUrlContainsPath, testInfo);
//     },
//     { timeout: CONST.TESTING.TIMEOUTS.STEP_TIMEOUT_MS }
//   );
// }

export async function clickFoblesNavigationButtonStep(page: Page, foblesButton: Locator, expectedUrlContainsPath: string, testInfo: TestInfo) {

  await clickWithMouseMarker(
    page,
    foblesButton,
    getLastTwoPathItems(expectedUrlContainsPath),
  );

  await postClickCommon(page, expectedUrlContainsPath, testInfo);
}


async function postClickCommon(page: Page, expectedUrlContainsPath: string, testInfo: TestInfo) {
  await dismissFoblesConfirmDialogIfPresent(page);
  await ensureMouseMarkerExists(page);

  expectCurrentUrlContains(page, expectedUrlContainsPath);

  // waitForURL only confirms the URL changed, not that the new page has actually
  // painted - without this, the step's auto screenshot can capture a stale composited
  // frame from the page being navigated away from instead of the new one.
  await page.waitForLoadState("load").catch(() => undefined);

  // Content Editor's ribbon can be left on whatever tab a previous session used -
  // normalize to Home before the screenshot so it's consistent regardless.
  if (isContentEditor(page)) {
    await ceRibbonOpenHome(page);
    await attachItemPathScreenshot(page, testInfo, expectedUrlContainsPath);
  }

  await pauseForHuman(page, CONST.TESTING.SPEED.SETTINGS[CONST.TESTING.SPEED.SELECTED].STEP_WAIT_MS *
    CONST.TESTING.NAVIGATION.HOLD_MULTIPLIER);
}

export async function ctrlClickFoblesNavigationButton(page: Page, foblesButton: Locator, expectedUrlContainsPath: string, testInfo: TestInfo, sharedBrowserContext: BrowserContext, fullTitle: string) {

  const newTabPromise = sharedBrowserContext.waitForEvent("page");

  await clickWithMouseMarker(page, foblesButton, `Ctrl-click jump ${getLastTwoPathItems(expectedUrlContainsPath)}`, {
    modifiers: ["Control"],
  });

  const newTab = await newTabPromise;
  await newTab
    .waitForLoadState("domcontentloaded")
    .catch(() => undefined);

  const newTabHoldMs = CONST.TESTING.SPEED.SETTINGS[CONST.TESTING.SPEED.SELECTED].STEP_WAIT_MS *
    CONST.TESTING.NAVIGATION.NEW_TAB_HOLD_MULTIPLIER;
  await bringPageToFront(newTab, newTabHoldMs);

  await postClickCommon(newTab, expectedUrlContainsPath, testInfo);

  const safeFileName = `step-${buildStepMatchKey(fullTitle)}.png`;
  await attachPageScreenshot(testInfo, newTab, safeFileName);

  await bringPageToFront(page);
  await newTab.close();

}