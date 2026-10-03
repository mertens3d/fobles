import type { Page, Locator, TestInfo } from "../fixtures/playwright";
import { isContentEditor } from "./path-helpers";
import { CONST } from "../CONST";
import { clickWithMouseMarker, ensureMouseMarkerExists } from "./mouse-proxy";
import { getLastTwoPathItems } from "./path-helpers";
import { dismissFoblesConfirmDialogIfPresent } from "../macros/fobles-macros";
import { expectCurrentUrlContains as expectCurrentUrlContains } from "../expect-snippets/expect-snippets";
import { attachItemPathScreenshot } from "./fobles-helpers-support/navigation-assertions";
import { humanPause } from "./wait-helpers";
import { ceRibbonOpenHome } from "../macros/sitecore-macros";
import { attachLocatorScreenshot } from "./fobles-helpers-support/screenshots";

export async function clickFoblesNavigationButton(page: Page, foblesButton: Locator, expectedUrlContainsPath: string, testInfo: TestInfo) {
  
  await attachLocatorScreenshot(testInfo, foblesButton, `fobles-navigation-button-${getLastTwoPathItems(expectedUrlContainsPath)}.png`);

  await clickWithMouseMarker(
    page,
    foblesButton,
    getLastTwoPathItems(expectedUrlContainsPath),
  );

  await dismissFoblesConfirmDialogIfPresent(page);

  await ensureMouseMarkerExists(page);
  
  expectCurrentUrlContains(page, expectedUrlContainsPath);

  // waitForURL only confirms the URL changed, not that the new page has actually
  // painted - without this, the step's auto screenshot can capture a stale composited
  // frame from the page being navigated away from instead of the new one.
  await page.waitForLoadState("load").catch(() => undefined);

  // Content Editor's ribbon can be left on whatever tab a previous session used -
  // normalize to Home before the screenshot so it's consistent regardless.
  if(isContentEditor(page)){
    await ceRibbonOpenHome(page);
    await attachItemPathScreenshot(page, testInfo, expectedUrlContainsPath);
  }

  await humanPause(page, CONST.TESTING.SPEED.SETTINGS[CONST.TESTING.SPEED.SELECTED].STEP_WAIT_MS *
    CONST.TESTING.NAVIGATION.HOLD_MULTIPLIER);

}