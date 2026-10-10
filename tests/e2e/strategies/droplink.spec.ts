import { expect, foblesTest } from "../../fixtures/playwright";
import {  setupContentEditorForTesting } from "../../helpers/fobles-helpers-support/test-setup";
import { fieldScreenshotName } from "./support/CONST";
import { runClickNavigationSteps } from "./click-navigation-steps";
import { STRATEGY_SCENARIOS } from "./support/strategy-scenarios";
import type { StrategyTestContext } from "./support/scenario.types";
import { stepExpectSitecoreInitialConditions, stepExpectFoblesInitialConditions, stepExpectFoblesOnConditions, stepExpectFoblesCtrlClick, stepExpectFoblesOffConditions } from "./support/strategy-test-helper";
import { factoryStrategyTestContext } from "../../helpers/strategy-test-context";
import { showBillboard } from "../../helpers/billboard";

foblesTest.describe("Strategy scenario: droplink", () => {
  foblesTest("toggling Fobles decorates and restores the droplink field", async ({ page }, testInfo) => {
    
    await setupContentEditorForTesting(page,STRATEGY_SCENARIOS.DROP_LINK);
    
    await showBillboard(page, STRATEGY_SCENARIOS.DROP_LINK.friendlyName);
    const testContext: StrategyTestContext = await factoryStrategyTestContext(page, STRATEGY_SCENARIOS.DROP_LINK, testInfo);

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
