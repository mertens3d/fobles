import { expect, test } from "../fixtures/playwright";
import { openSitecorePage } from "../fixtures/sitecore";
import { CONST } from "../CONST";
import {
  createStep,
  expectFoblesButtonNewTabNavigation,
  expectFoblesButtonSameTabNavigation,
} from "../fobles-helpers";
import { showMouseMarker } from "../mouse-proxy";
import { clickLboltButton } from "../sitecore-macros";
import { findFoblesFrame } from "../frame-finder";
import { FOBLES, FOBLES_HIDDEN_CLASS_PATTERN } from "./CONST";
import { EDITOR_SCENARIOS } from "./editor-scenarios";

const STEP_WAIT_MS = CONST.SPEED.SETTINGS[CONST.SPEED.SELECTED].STEP_WAIT_MS;

// Quick Info (src/content/features/augmentor/editor-strategies/quick-info-section.ts) decorates
// Content Editor's own built-in Quick Info panel, always present at the top of any open item, so
// unlike reference-links.spec.ts this follows the usual strategies/*.spec.ts order: toggle Fobles
// on, then locate the table already sitting in the DOM. Four buttons are expected here - Item ID
// and Item path each have one source, while Template has two (the template's own path link and
// its id input) - see quick-info-section.ts's candidates.
const SCENARIO = EDITOR_SCENARIOS.QUICK_INFO_SECTION;

test.describe("Editor scenario: quick info section", () => {
  test("toggling Fobles decorates and restores the Quick Info panel", async ({ page }, testInfo) => {
    await openSitecorePage(page, `${CONST.SITECORE.PATHS.CONTENT_EDITOR}&fo=${SCENARIO.itemId}`);
    await showMouseMarker(page);

    const foblesFrame = await findFoblesFrame(page);
    await showMouseMarker(foblesFrame);

    const quickInfoTable = foblesFrame.locator(CONST.SITECORE.SELECTORS.QUICK_INFO_TABLE).first();
    const lboltButton = foblesFrame.locator(CONST.SITECORE.SELECTORS.LBOLT_BUTTON).first();
    const step = createStep(page, testInfo, quickInfoTable, "Quick Info");

    await step("Default stage: Quick Info renders as plain Sitecore text", async () => {
      await expect(quickInfoTable).toBeVisible();
      await expect(quickInfoTable.locator(FOBLES.SELECTORS.WRAPPER)).toHaveCount(0);
      await page.waitForTimeout(STEP_WAIT_MS);
    });

    await step("Toggle Fobles on: Item ID, Item path, and Template each get a Fobles button", async () => {
      await clickLboltButton(page, lboltButton);
      await expect(quickInfoTable.locator(FOBLES.SELECTORS.WRAPPER)).toHaveCount(4);
      for (const button of [
        SCENARIO.itemIdButton,
        SCENARIO.itemPathButton,
        SCENARIO.templatePathButton,
        SCENARIO.templateIdButton,
      ]) {
        await expect(
          quickInfoTable.locator(FOBLES.SELECTORS.BUTTON, { hasText: button.expectedButtonText }),
        ).toHaveText(button.expectedButtonText);
      }
      await page.waitForTimeout(STEP_WAIT_MS);
    });

    const itemPathButton = quickInfoTable.locator(FOBLES.SELECTORS.BUTTON, {
      hasText: SCENARIO.itemPathButton.expectedButtonText,
    });

    await step(
      `Ctrl+click: opens the item in a new tab: "${SCENARIO.itemPathButton.expectedFoValue}"`,
      async (fullTitle) => {
        await expectFoblesButtonNewTabNavigation(page, testInfo, itemPathButton, SCENARIO.itemPathButton.expectedFoValue, fullTitle);
      },
      { screenshot: false },
    );

    await step("Toggle Fobles off: the panel returns to its original shape", async () => {
      await clickLboltButton(page, lboltButton);
      await expect(quickInfoTable.locator(FOBLES.SELECTORS.WRAPPER)).toHaveCount(0);
      await expect(quickInfoTable.locator("span.scEditorHeaderQuickInfoPath, input.scEditorHeaderQuickInfoInput").first()).not.toHaveClass(
        FOBLES_HIDDEN_CLASS_PATTERN,
      );
    });

    // Toggle back on to reveal the button again for the click test below - no screenshot needed,
    // already captured above.
    await clickLboltButton(page, lboltButton);

    const itemIdButton = quickInfoTable.locator(FOBLES.SELECTORS.BUTTON, {
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
