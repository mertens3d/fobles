import { expect, foblesTest } from "../../fixtures/playwright";
import { openSitecorePage } from "../../fixtures/sitecore";
import { CONST } from "../../CONST";
import { createStep } from "../../helpers/fobles-helpers-support/test-step";
import {
  expectFoblesButtonNewTabNavigation,
  expectFoblesButtonSameTabNavigation,
} from "../../helpers/fobles-helpers-support/navigation-assertions";
import { clickWithMouseMarker, ensureMouseMarkerExists } from "../../helpers/mouse-proxy";

import { findFoblesFrame } from "../../helpers/frame-finder";
import { EDITOR_SCENARIOS } from "./editor-scenarios";
import { clickLbolt } from "../../macros/fobles-macros";
import { humanPause } from "../../helpers/wait-helpers";
import { FOBLES_HIDDEN_CLASS_PATTERN } from "../strategies/support/CONST";

const STEP_WAIT_MS = CONST.TESTING.SPEED.SETTINGS[CONST.TESTING.SPEED.SELECTED].STEP_WAIT_MS;

// Quick Info (src/content/features/augmentor/editor-strategies/quick-info-section.ts) decorates
// Content Editor's own built-in Quick Info panel, always present at the top of any open item, so
// unlike reference-links.spec.ts this follows the usual strategies/*.spec.ts order: toggle Fobles
// on, then locate the table already sitting in the DOM. Four buttons are expected here - Item ID
// and Item path each have one source, while Template has two (the template's own path link and
// its id input) - see quick-info-section.ts's candidates.
const SCENARIO = EDITOR_SCENARIOS.QUICK_INFO_SECTION;

foblesTest.describe("Editor scenario: quick info section", () => {
  foblesTest("toggling Fobles decorates and restores the Quick Info panel", async ({ page }, testInfo) => {
   
   
    await openSitecorePage(page, `${CONST.SITECORE.PATHS.CONTENT_EDITOR}&fo=${SCENARIO.itemId}`);

    const foblesFrame = await findFoblesFrame(page);
    await ensureMouseMarkerExists(foblesFrame);

    const quickInfoTable = foblesFrame.locator(CONST.SITECORE.SELECTORS.QUICK_INFO_TABLE).first();
    const lboltButton = foblesFrame.locator(CONST.FOBLES.SELECTORS.LBOLT_BUTTON).first();
    const step = createStep(page, testInfo, quickInfoTable, "Quick Info");

    await step("Default stage: Quick Info renders as plain Sitecore text", async () => {
      await expect(quickInfoTable).toBeVisible();
      await expect(quickInfoTable.locator(CONST.FOBLES.SELECTORS.WRAPPER)).toHaveCount(0);
      await humanPause(page, STEP_WAIT_MS);
    });

    await step("Toggle Fobles on: Item ID, Item path, and Template each get a Fobles button", async () => {
      await clickLbolt(page);

      await expect(quickInfoTable.locator(CONST.FOBLES.SELECTORS.WRAPPER)).toHaveCount(4);
      for (const button of [
        SCENARIO.itemIdButton,
        SCENARIO.itemPathButton,
        SCENARIO.templatePathButton,
        SCENARIO.templateIdButton,
      ]) {
        await expect(
          quickInfoTable.locator(CONST.FOBLES.SELECTORS.DATA_IS_FOBLES_BUTTON, { hasText: button.expectedButtonText }),
        ).toHaveText(button.expectedButtonText);
      }
      await humanPause(page, STEP_WAIT_MS);
    });

    const itemPathButton = quickInfoTable.locator(CONST.FOBLES.SELECTORS.DATA_IS_FOBLES_BUTTON, {
      hasText: SCENARIO.itemPathButton.expectedButtonText,
    });

    await step(
      `Ctrl+click: opens the item in a new tab: "${SCENARIO.itemPathButton.expectedFoValue}"`,
      async (fullTitle) => {
        const popupPromise = page.context().waitForEvent("page");
        await clickWithMouseMarker(page, itemPathButton, "Fobles item button", { modifiers: ["Control"] });
        const popup = await popupPromise;
        await expectFoblesButtonNewTabNavigation(testInfo, SCENARIO.itemPathButton.expectedFoValue, fullTitle, popup, page);
      },
      { screenshot: false },
    );

    await step("Toggle Fobles off: the panel returns to its original shape", async () => {
      await clickLbolt(page);
      await expect(quickInfoTable.locator(CONST.FOBLES.SELECTORS.WRAPPER)).toHaveCount(0);
      await expect(quickInfoTable.locator("span.scEditorHeaderQuickInfoPath, input.scEditorHeaderQuickInfoInput").first()).not.toHaveClass(
        FOBLES_HIDDEN_CLASS_PATTERN,
      );
    });

    await clickLbolt(page);

    const itemIdButton = quickInfoTable.locator(CONST.FOBLES.SELECTORS.DATA_IS_FOBLES_BUTTON, {
      hasText: SCENARIO.itemIdButton.expectedButtonText,
    });

    await step(
      `Click navigates to the item: "${SCENARIO.itemIdButton.expectedFoValue}"`,
      async (fullTitle) => {
        await expectFoblesButtonSameTabNavigation(page, testInfo, itemIdButton, SCENARIO.itemIdButton.expectedFoValue, fullTitle);
      },
      { screenshot: false },
    );
  });
});
