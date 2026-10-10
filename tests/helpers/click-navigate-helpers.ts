import type { Page, Locator, TestInfo } from "../fixtures/playwright";
import { isContentEditor } from "./path-helpers";
import { CONST } from "../CONST";
import { clickWithMouseMarker, ensureMouseMarkerExists } from "./mouse-proxy";
import { getLastTwoPathItems } from "./path-helpers";
import { dismissFoblesConfirmDialogIfPresent } from "../macros/fobles-macros";
import { expectCurrentUrlContains as expectCurrentUrlContains, expectFoValue } from "../expect-snippets/expect-snippets";
import { attachItemPathScreenshot } from "./fobles-helpers-support/navigation-assertions";
import { pauseForHuman } from "./wait-helpers";
import { ceRibbonOpenHome } from "../macros/sitecore-macros";
import {  attachPageScreenshot } from "./fobles-helpers-support/screenshots";
import type { BrowserContext } from "@playwright/test";
import { bringPageToFront } from "./page-switch";

import { buildStepMatchKey } from "./fobles-helpers-support/step-match-key";
import type { ClickNavigationExpect } from "../constants_partials/CONST.Types";

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

export async function clickFoblesNavigationButtonStep(page: Page, foblesButton: Locator,  testInfo: TestInfo,  clickNavigationExpect: ClickNavigationExpect, label: string) {

  await clickWithMouseMarker(
    page,
    foblesButton,
    label,
  );

  await postClickCommon(page,  clickNavigationExpect, testInfo, label);
}

async function postClickCommon(page: Page, clickNavigationExpect: ClickNavigationExpect, testInfo: TestInfo, label: string) {
  await dismissFoblesConfirmDialogIfPresent(page);
  await ensureMouseMarkerExists(page);

  if(clickNavigationExpect?.foValue){
    expectFoValue(page, clickNavigationExpect.foValue);
  }
  if(clickNavigationExpect?.url){
    
    expectCurrentUrlContains(page, clickNavigationExpect.url);
  }

  // waitForURL only confirms the URL changed, not that the new page has actually
  // painted - without this, the step's auto screenshot can capture a stale composited
  // frame from the page being navigated away from instead of the new one.
  await page.waitForLoadState("load").catch(() => undefined);

  // Content Editor's ribbon can be left on whatever tab a previous session used -
  // normalize to Home before the screenshot so it's consistent regardless.
  if (isContentEditor(page)) {
    await ceRibbonOpenHome(page);
    await attachItemPathScreenshot(page, testInfo, label);
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

  await postClickCommon(newTab, { url: expectedUrlContainsPath }, testInfo, `Ctrl-click jump ${getLastTwoPathItems(expectedUrlContainsPath)}`);

  const safeFileName = `step-${buildStepMatchKey(fullTitle)}.png`;
  await attachPageScreenshot(testInfo, newTab, safeFileName);

  await bringPageToFront(page);
  await newTab.close();

}