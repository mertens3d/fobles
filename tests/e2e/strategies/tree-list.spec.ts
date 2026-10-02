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

// Tree List replaces the "all items" tree pane (.scScrollbox.scContentControlTree) and the
// "selected items" pane (.scContentControlSelectedList) independently
// (src/content/features/augmentor/field-strategies/sc-treelist.ts) - each only if it actually has
// items, so unlike Multilist with Search this test only asserts the selected pane (whose one item
// is guaranteed), not an exact overall wrapper count.
const SCENARIO = STRATEGY_SCENARIOS.TREE_LIST;

foblesTest.describe("Strategy scenario: tree list", () => {
  foblesTest("toggling Fobles decorates and restores the tree list field", async ({ page }, testInfo) => {

    await setupContentEditorForTesting(page, STRATEGY_SCENARIOS.TREE_LIST);

    await showBillboard(page, STRATEGY_SCENARIOS.TREE_LIST.friendlyName);
    const testContext: StrategyTestContext = await factoryStrategyTestContext(page, STRATEGY_SCENARIOS.TREE_LIST, testInfo);

    await stepExpectSitecoreInitialConditions(testContext);
    await stepExpectFoblesInitialConditions(testContext);
    await stepExpectFoblesOnConditions(testContext);
    await stepExpectFoblesCtrlClick(testContext);
    await stepExpectFoblesOffConditions(testContext);

    runClickNavigationSteps(testContext.step, page, testInfo, testContext.fieldTable, testContext.locatorFirstResult, testContext.SCENARIO, async () => {
      await expect(testContext.fieldTable).toHaveScreenshot(fieldScreenshotName(testContext.SCENARIO.SCREENSHOT_BASE_NAME, "DEFAULT"));
    });

    // const testContext: StrategyTestContext = await factoryStrategyTestContext(
    //   page,
    //   SCENARIO,
    //   testInfo
    // );
    // // const selectedPane = testContext.fieldTable.locator(CONST.SITECORE.SELECTORS.STRATEGIES.TREE_LIST).first();
    // const selectedPaneButton = testContext.fieldTable
    //   .locator(`.scContentControlSelectedList + ${CONST.FOBLES.SELECTORS.WRAPPER} ${CONST.FOBLES.SELECTORS.BUTTON}`)
    //   .first();
    // const step = createStep(page, testInfo, getEditorSectionLocator(testContext.fieldTable), SCENARIO.friendlyName);

    // await step("Default stage: field renders as a plain Sitecore tree list", async () => {
    //   await expect(testContext.locatorFirstResult).toBeVisible();
    //   await expect(testContext.fieldTable.locator(CONST.FOBLES.SELECTORS.WRAPPER)).toHaveCount(0);
    //   await foblesWaitForTimeout(page, STEP_WAIT_MS);
    // });

    // await step("Toggle Fobles on: the selected pane gets a Fobles button", async () => {
    //   await clickLbolt(page);
    //   await expect(testContext.locatorFirstResult).toHaveClass(FOBLES_HIDDEN_CLASS_PATTERN);

    //   await expect(selectedPaneButton).toBeVisible();
    //   await expect(selectedPaneButton).toHaveText(SCENARIO.expectedButtonText);
    //   await foblesWaitForTimeout(page, STEP_WAIT_MS);
    // });

    // // Explicit navigationButton - the "all items" tree pane can render more than one Fobles
    // // button (one per browsable node, including ancestor folders), so fieldTable's default
    // // first-button lookup isn't reliable here; the selected pane's own button is the field's
    // // actual value.
    // runClickNavigationSteps(step, page, testInfo, testContext.fieldTable,  testContext.locatorFirstResult, SCENARIO, undefined, selectedPaneButton);
  });
});
