import { expect, foblesTest } from "../../fixtures/playwright";
import { showBillboard } from "../../helpers/billboard";
import { CONST } from "../../CONST";
import { factoryStrategyTestContext } from "../../helpers/strategy-test-context";
import {
  setupContentEditorForTesting,
} from "../../helpers/fobles-helpers";
import { fieldScreenshotName } from "./support/CONST";
import { runClickNavigationSteps } from "./click-navigation-steps";
import { STRATEGY_SCENARIOS } from "./support/strategy-scenarios";
import type { StrategyTestContext } from "./support/scenario.types";
import { stepExpectFoblesCtrlClick, stepExpectFoblesInitialConditions, stepExpectFoblesOffConditions, stepExpectFoblesOnConditions, stepExpectSitecoreInitialConditions } from "./support/strategy-test-helper";

const STEP_WAIT_MS = CONST.TESTING.SPEED.SETTINGS[CONST.TESTING.SPEED.SELECTED].STEP_WAIT_MS;

// Drop Tree's readonly combobox-edit input renders Sitecore's resolved display name (not the raw
// GUID), and its button has no strategy variant class - just the base "fobles-button"
// (src/content/features/augmentor/field-strategies/sc-droptree.ts).
const SCENARIO = STRATEGY_SCENARIOS.DROP_TREE;

foblesTest.describe("Strategy scenario: drop tree", () => {
  foblesTest("toggling Fobles decorates and restores the drop tree field", async ({ page }, testInfo) => {

    await setupContentEditorForTesting(page, STRATEGY_SCENARIOS.DROP_TREE);
    await showBillboard(page, STRATEGY_SCENARIOS.DROP_TREE.friendlyName);


    const testContext: StrategyTestContext = await factoryStrategyTestContext(
      page,
      SCENARIO,
      testInfo
    );

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
