import type {  Page, Locator, TestInfo } from "../fixtures/playwright";
import { CONST } from "../CONST";
import { clickWithMouseMarker, ensureMouseMarkerExists } from "./mouse-proxy";
import { getLastTwoPathItems } from "./path-helpers";
import { dismissFoblesConfirmDialogIfPresent } from "../macros/fobles-macros";
import { expectCurrentUrl as expectCurrentUrlContains } from "../expect-snippets/expect-snippets";
import { attachItemPathScreenshot } from "./fobles-helpers-support/navigation-assertions";
import { humanPause } from "./wait-helpers";

export async function clickFoblesNavigationButton(page:Page, foblesScButton: Locator, path: string, testInfo: TestInfo) {
 await clickWithMouseMarker(    
        page,
        foblesScButton,
        getLastTwoPathItems(path),
      );
      await dismissFoblesConfirmDialogIfPresent(page);

      await ensureMouseMarkerExists(page);
      expectCurrentUrlContains(page, path);

      await attachItemPathScreenshot(page, testInfo, path);

      await humanPause(page,  CONST.TESTING.SPEED.SETTINGS[CONST.TESTING.SPEED.SELECTED].STEP_WAIT_MS *
          CONST.TESTING.NAVIGATION.HOLD_MULTIPLIER);
      
}