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

// Multilist with Search replaces BOTH panes independently
// (src/content/features/augmentor/field-strategies/sc-multilistwithsearch.ts): the "all items"
// search-results pane (select.scBucketListBox, empty until searched - no buttons) and the
// "selected items" pane (select.scBucketListSelectedBox), each getting its own
// [data-fobles-wrapper] - like Tag List, but functional.
const SCENARIO = STRATEGY_SCENARIOS.MULTILIST_WITH_SEARCH;

test.describe("Strategy scenario: multilist with search", () => {
  test("toggling Fobles decorates and restores the multilist with search field", async ({ page }, testInfo) => {
    const { fieldTable, lboltButton } = await activateFoblesForFieldStrategy(
      page,
      SCENARIO.itemId,
      SCENARIO.fieldLabel,
    );
    const selectedPane = fieldTable.locator("select.scBucketListSelectedBox").first();
    const step = createStep(page, testInfo, getEditorSectionLocator(fieldTable), "Multilist with Search");

    await step("Default stage: field renders as a plain Sitecore multilist with search", async () => {
      await expect(selectedPane).toBeVisible();
      await expect(fieldTable.locator(FOBLES.SELECTORS.WRAPPER)).toHaveCount(0);
      await page.waitForTimeout(STEP_WAIT_MS);
    });

    await step("Toggle Fobles on: both panes get Fobles wrappers", async () => {
      await clickLboltButton(page, lboltButton);
      await expect(selectedPane).toHaveClass(FOBLES_HIDDEN_CLASS_PATTERN);
      await expect(fieldTable.locator(FOBLES.SELECTORS.WRAPPER)).toHaveCount(2);

      const selectedPaneButton = fieldTable
        .locator(`select.scBucketListSelectedBox + ${FOBLES.SELECTORS.WRAPPER} ${FOBLES.SELECTORS.BUTTON}`)
        .first();
      await expect(selectedPaneButton).toBeVisible();
      await expect(selectedPaneButton).toHaveText(SCENARIO.expectedButtonText);
      await page.waitForTimeout(STEP_WAIT_MS);
    });

    await runClickNavigationSteps(step, page, testInfo, fieldTable, lboltButton, selectedPane, SCENARIO);
  });
});
