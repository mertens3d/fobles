import { expect, foblesTest } from "../../fixtures/playwright";
import { CONST } from "../../CONST";
import {
  setupContentEditorForTesting,
} from "../../helpers/fobles-helpers-support/test-setup";

import { fieldScreenshotName } from "./support/CONST";
import { runClickNavigationSteps } from "./click-navigation-steps";
import { STRATEGY_SCENARIOS } from "./support/strategy-scenarios";
import type { StrategyTestContext } from "./support/scenario.types";
import { factoryStrategyTestContext } from "../../helpers/strategy-test-context";
import { showBillboard } from "../../helpers/billboard";
import { stepExpectSitecoreInitialConditions, stepExpectFoblesInitialConditions, stepExpectFoblesOnConditions, stepExpectFoblesCtrlClick, stepExpectFoblesOffConditions } from "./support/strategy-test-helper";

const STEP_WAIT_MS = CONST.TESTING.SPEED.SETTINGS[CONST.TESTING.SPEED.SELECTED].STEP_WAIT_MS;

// Multilist with Search replaces BOTH panes independently
// (src/content/features/augmentor/field-strategies/sc-multilistwithsearch.ts): the "all items"
// search-results pane (select.scBucketListBox, empty until searched - no buttons) and the
// "selected items" pane (select.scBucketListSelectedBox), each getting its own
// [data-fobles-wrapper] - like Tag List, but functional.
const SCENARIO = STRATEGY_SCENARIOS.MULTILIST_WITH_SEARCH;

foblesTest.describe("Strategy scenario: multilist with search", () => {
  foblesTest("toggling Fobles decorates and restores the multilist with search field", async ({ page }, testInfo) => {
  await setupContentEditorForTesting(page,STRATEGY_SCENARIOS.MULTILIST_WITH_SEARCH);
      
      await showBillboard(page, STRATEGY_SCENARIOS.MULTILIST_WITH_SEARCH.friendlyName);
      const testContext: StrategyTestContext = await factoryStrategyTestContext(page, STRATEGY_SCENARIOS.MULTILIST_WITH_SEARCH, testInfo);
  
      await stepExpectSitecoreInitialConditions(testContext);
      await stepExpectFoblesInitialConditions(testContext);
      await stepExpectFoblesOnConditions(testContext);
      await stepExpectFoblesCtrlClick(testContext);
      await stepExpectFoblesOffConditions(testContext);
      
      runClickNavigationSteps(testContext.step, page, testInfo, testContext.fieldTable, testContext.locatorFirstResult, testContext.SCENARIO, async () => {
        await expect(testContext.fieldTable).toHaveScreenshot(fieldScreenshotName(testContext.SCENARIO.SCREENSHOT_BASE_NAME, "DEFAULT"));
      });
  });
});
