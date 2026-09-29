import { expect, test } from "../fixtures/playwright";
import { CONST } from "../CONST";
import {
  createStep,
  getEditorSectionLocator,
} from "../fobles-helpers";

import { FOBLES_HIDDEN_CLASS_PATTERN } from "./CONST";
import { runClickNavigationSteps } from "./click-navigation-steps";
import { STRATEGY_SCENARIOS } from "./strategy-scenarios";
import { clickLbolt } from "../macros/fobles-macros";
import type { StrategyTestContext } from "./scenario.types";
import { factoryStrategyTestContext } from "../strategy-test-context";

const STEP_WAIT_MS = CONST.SPEED.SETTINGS[CONST.SPEED.SELECTED].STEP_WAIT_MS;

// Multilist with Search replaces BOTH panes independently
// (src/content/features/augmentor/field-strategies/sc-multilistwithsearch.ts): the "all items"
// search-results pane (select.scBucketListBox, empty until searched - no buttons) and the
// "selected items" pane (select.scBucketListSelectedBox), each getting its own
// [data-fobles-wrapper] - like Tag List, but functional.
const SCENARIO = STRATEGY_SCENARIOS.MULTILIST_WITH_SEARCH;

test.describe("Strategy scenario: multilist with search", () => {
  test("toggling Fobles decorates and restores the multilist with search field", async ({ page }, testInfo) => {
    const testContext: StrategyTestContext = await factoryStrategyTestContext(
      page,
      SCENARIO,
      testInfo
    );
    // const selectedPane = testContext.fieldTable.locator(CONST.SITECORE.SELECTORS.STRATEGIES.MULTILIST_WITH_SEARCH).first();
    const step = createStep(page, testInfo, getEditorSectionLocator(testContext.fieldTable), SCENARIO.friendlyName);

    await step("Default stage: field renders as a plain Sitecore multilist with search", async () => {
      await expect(testContext.locatorFirstResult).toBeVisible();
      await expect(testContext.fieldTable.locator(CONST.FOBLES.SELECTORS.WRAPPER)).toHaveCount(0);
      await foblesWaitForTimeout(page, STEP_WAIT_MS);
    });

    await step("Toggle Fobles on: both panes get Fobles wrappers", async () => {
      await clickLbolt(page);
      await expect(testContext.locatorFirstResult).toHaveClass(FOBLES_HIDDEN_CLASS_PATTERN);
      await expect(testContext.fieldTable.locator(CONST.FOBLES.SELECTORS.WRAPPER)).toHaveCount(2);

      const selectedPaneButton = testContext.fieldTable
        .locator(`select.scBucketListSelectedBox + ${CONST.FOBLES.SELECTORS.WRAPPER} ${CONST.FOBLES.SELECTORS.BUTTON}`)
        .first();
      await expect(selectedPaneButton).toBeVisible();
      await expect(selectedPaneButton).toHaveText(SCENARIO.expectedButtonText);
      await foblesWaitForTimeout(page, STEP_WAIT_MS);
    });

    runClickNavigationSteps(step, page, testInfo, testContext.fieldTable, testContext.locatorFirstResult, SCENARIO);
  });
});
