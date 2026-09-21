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

// Tree List replaces the "all items" tree pane (.scScrollbox.scContentControlTree) and the
// "selected items" pane (.scContentControlSelectedList) independently
// (src/content/features/augmentor/field-strategies/sc-treelist.ts) - each only if it actually has
// items, so unlike Multilist with Search this test only asserts the selected pane (whose one item
// is guaranteed), not an exact overall wrapper count.
const SCENARIO = STRATEGY_SCENARIOS.TREE_LIST;

test.describe("Strategy scenario: tree list", () => {
  test("toggling Fobles decorates and restores the tree list field", async ({ page }, testInfo) => {
    const { fieldTable, lboltButton } = await activateFoblesForFieldStrategy(
      page,
      SCENARIO.itemId,
      SCENARIO.fieldLabel,
    );
    const selectedPane = fieldTable.locator(".scContentControlSelectedList").first();
    const step = createStep(page, testInfo, getEditorSectionLocator(fieldTable), "Tree List");

    await step("Default stage: field renders as a plain Sitecore tree list", async () => {
      await expect(selectedPane).toBeVisible();
      await expect(fieldTable.locator(FOBLES.SELECTORS.WRAPPER)).toHaveCount(0);
      await page.waitForTimeout(STEP_WAIT_MS);
    });

    await step("Toggle Fobles on: the selected pane gets a Fobles button", async () => {
      await clickLboltButton(page, lboltButton);
      await expect(selectedPane).toHaveClass(FOBLES_HIDDEN_CLASS_PATTERN);

      const selectedPaneButton = fieldTable
        .locator(`.scContentControlSelectedList + ${FOBLES.SELECTORS.WRAPPER} ${FOBLES.SELECTORS.BUTTON}`)
        .first();
      await expect(selectedPaneButton).toBeVisible();
      await expect(selectedPaneButton).toHaveText(SCENARIO.expectedButtonText);
      await page.waitForTimeout(STEP_WAIT_MS);
    });

    await runClickNavigationSteps(step, page, testInfo, fieldTable, lboltButton, selectedPane, SCENARIO);
  });
});
