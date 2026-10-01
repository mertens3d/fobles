import type {  Page, Locator, TestInfo } from "../fixtures/playwright";
import { CONST } from "../CONST";
import { clickWithMouseMarker, ensureMouseMarkerExists } from "./mouse-proxy";
import { getLastTwoPathItems } from "./path-helpers";
import { dismissFoblesConfirmDialogIfPresent } from "../macros/fobles-macros";
import { expectCurrentUrl } from "../expectSnippets/expectSnippets";
import { attachItemPathScreenshot } from "./fobles-helpers";

export async function clickFoblesNavigationButton(page:Page, foblesScButton: Locator, path: string, testInfo: TestInfo) {
 await clickWithMouseMarker(    
        page,
        foblesScButton,
        getLastTwoPathItems(path),
      );
      await dismissFoblesConfirmDialogIfPresent(page);

      await ensureMouseMarkerExists(page);
      expectCurrentUrl(page, path);

      await attachItemPathScreenshot(page, testInfo, path);
      await page.waitForTimeout(
        CONST.TESTING.SPEED.SETTINGS[CONST.TESTING.SPEED.SELECTED].STEP_WAIT_MS *
          CONST.TESTING.NAVIGATION.HOLD_MULTIPLIER,
      );
}