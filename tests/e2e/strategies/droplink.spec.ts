import { expect, test } from "../fixtures/playwright";
import {  setupContentEditorForTesting } from "../fobles-helpers";
import { fieldScreenshotName } from "./CONST";
import { runClickNavigationSteps } from "./click-navigation-steps";
import { STRATEGY_SCENARIOS } from "./strategy-scenarios";
import type { StrategyTestContext } from "./scenario.types";
import { stepExpectSitecoreInitialConditions, stepExpectFoblesInitialConditions, stepExpectFoblesOnConditions, stepExpectFoblesCtrlClick, stepExpectFoblesOffConditions } from "./strategy-test-helper";
import { factoryStrategyTestContext } from "../strategy-test-context";
import { showBillboard } from "../billboard";

test.describe("Strategy scenario: droplink", () => {
  test("toggling Fobles decorates and restores the droplink field", async ({ page }, testInfo) => {
    
    await setupContentEditorForTesting(page,STRATEGY_SCENARIOS.DROP_LINK);
    
    await showBillboard(page, factoryStrategyTestContext.name, { xPercent: 50, yPercent: 50 });
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

