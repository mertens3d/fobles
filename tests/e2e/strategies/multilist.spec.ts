import { expect, test } from "../fixtures/playwright";
import { CONST } from "../CONST";
import {
  activateFoblesForFieldStrategy,
  createStep,
  getEditorSectionLocator,
} from "../fobles-helpers";
import { clickLboltButton } from "../sitecore-macros";
import { FOBLES, FOBLES_HIDDEN_CLASS_PATTERN } from "./CONST";
import { runClickNavigationSteps } from "./click-navigation-steps";
import { STRATEGY_SCENARIOS } from "./strategy-scenarios";

const STEP_WAIT_MS = CONST.SPEED.SETTINGS[CONST.SPEED.SELECTED].STEP_WAIT_MS;

// Multilist replaces a single pane (the selected-items select), with one button per selected
// option (src/content/features/augmentor/field-strategies/sc-multilist.ts) - unlike Tag List,
// which replaces two separate panes.
const SCENARIO = STRATEGY_SCENARIOS.MULTILIST_OPTIONS;

test.describe("Strategy scenario: multilist", () => {
  test("toggling Fobles decorates and restores the multilist field", async ({ page }, testInfo) => {
    const { fieldTable, lboltButton } = await activateFoblesForFieldStrategy(
      page,
      SCENARIO.itemId,
      SCENARIO.fieldLabel,
    );
    // Multilist renders two select boxes sharing this class (the "All"/unselected pane and the
    // "Selected" pane) - Fobles only wraps the selected-items one, so target it specifically
    // rather than .first(), which resolves to the unselected pane instead.
    const select = fieldTable.locator("select.scContentControlMultilistBox[id$='_selected']").first();
    const step = createStep(page, testInfo, getEditorSectionLocator(fieldTable), "Multilist");

    await step("Default stage: field renders as a plain Sitecore multilist", async () => {
      await expect(select).toBeVisible();
      await expect(fieldTable.locator(FOBLES.SELECTORS.WRAPPER)).toHaveCount(0);
      await page.waitForTimeout(STEP_WAIT_MS);
    });

    await step("Toggle Fobles on: the field gets one Fobles button", async () => {
      await clickLboltButton(page, lboltButton);
      await expect(select).toHaveClass(FOBLES_HIDDEN_CLASS_PATTERN);
      await expect(fieldTable.locator(FOBLES.SELECTORS.WRAPPER)).toHaveCount(1);

      const foblesButtons = fieldTable.locator(FOBLES.SELECTORS.BUTTON);
      await expect(foblesButtons).toHaveCount(1);
      await expect(foblesButtons.first()).toHaveText(SCENARIO.expectedButtonText);
      await page.waitForTimeout(STEP_WAIT_MS);
    });

    await runClickNavigationSteps(step, page, testInfo, fieldTable, lboltButton, select, SCENARIO);
  });
});
