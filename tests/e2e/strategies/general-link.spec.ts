import { expect, test } from "../fixtures/playwright";
import { CONST } from "../CONST";
import { fieldScreenshotName, FOBLES_HIDDEN_CLASS_PATTERN } from "./support/CONST";
import { runClickNavigationSteps } from "./click-navigation-steps";
import { STRATEGY_SCENARIOS } from "./support/strategy-scenarios";
import { clickLbolt } from "../macros/fobles-macros";
import type { StrategyTestContext } from "./support/scenario.types";
import { stepExpectFoblesCtrlClick, stepExpectFoblesInitialConditions, stepExpectFoblesOffConditions, stepExpectFoblesOnConditions, stepExpectSitecoreInitialConditions } from "./support/strategy-test-helper";
import { factoryStrategyTestContext } from "../strategy-test-context";
import { foblesWaitForTimeout } from "../helpers/wait-helpers";
import { setupContentEditorForTesting } from "../fobles-helpers";
import { showBillboard } from "../billboard";

const STEP_WAIT_MS = CONST.SPEED.SETTINGS[CONST.SPEED.SELECTED].STEP_WAIT_MS;
const SCENARIO = STRATEGY_SCENARIOS.GENERAL_LINK;

test.describe("Strategy scenario: general link", () => {
  test("toggling Fobles decorates and restores the general link field", async ({ page }, testInfo) => {
    await setupContentEditorForTesting(page,STRATEGY_SCENARIOS.GENERAL_LINK);
        
        await showBillboard(page, STRATEGY_SCENARIOS.GENERAL_LINK.friendlyName);
        const testContext: StrategyTestContext = await factoryStrategyTestContext(page, STRATEGY_SCENARIOS.GENERAL_LINK, testInfo);
    
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
