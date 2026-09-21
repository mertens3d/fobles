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

// Drop Tree's readonly combobox-edit input renders Sitecore's resolved display name (not the raw
// GUID), and its button has no strategy variant class - just the base "fobles-button"
// (src/content/features/augmentor/field-strategies/sc-droptree.ts).
const SCENARIO = STRATEGY_SCENARIOS.DROP_TREE;

test.describe("Strategy scenario: drop tree", () => {
  test("toggling Fobles decorates and restores the drop tree field", async ({ page }, testInfo) => {
    const { fieldTable, lboltButton } = await activateFoblesForFieldStrategy(
      page,
      SCENARIO.itemId,
      SCENARIO.fieldLabel,
    );
    const input = fieldTable.locator("input.scComboboxEdit[readonly]").first();
    const step = createStep(page, testInfo, getEditorSectionLocator(fieldTable), "Drop Tree");

    await step("Default stage: field renders as a plain Sitecore combobox-edit input", async () => {
      await expect(input).toBeVisible();
      await expect(fieldTable.locator(FOBLES.SELECTORS.WRAPPER)).toHaveCount(0);
      await page.waitForTimeout(STEP_WAIT_MS);
    });

    await step("Toggle Fobles on: the field gets a Fobles button", async () => {
      await clickLboltButton(page, lboltButton);
      await expect(input).toHaveClass(FOBLES_HIDDEN_CLASS_PATTERN);
      const foblesButton = fieldTable.locator(FOBLES.SELECTORS.BUTTON).first();
      await expect(foblesButton).toBeVisible();
      await expect(foblesButton).toHaveText(SCENARIO.expectedButtonText);
      await page.waitForTimeout(STEP_WAIT_MS);
    });

    await runClickNavigationSteps(step, page, testInfo, fieldTable, lboltButton, input, SCENARIO);
  });
});
