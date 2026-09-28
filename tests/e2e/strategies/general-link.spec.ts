import { expect, test } from "../fixtures/playwright";
import { CONST } from "../CONST";
import { FOBLES_HIDDEN_CLASS_PATTERN } from "./CONST";
import { runClickNavigationSteps } from "./click-navigation-steps";
import { STRATEGY_SCENARIOS } from "./strategy-scenarios";
import { clickLbolt } from "../macros/fobles-macros";
import type { StrategyTestContext } from "./scenario.types";
import { stepExpectSitecoreInitialConditions } from "./strategy-test-helper";
import { factoryStrategyTestContext } from "../strategy-test-context";

const STEP_WAIT_MS = CONST.SPEED.SETTINGS[CONST.SPEED.SELECTED].STEP_WAIT_MS;
const SCENARIO = STRATEGY_SCENARIOS.GENERAL_LINK;

test.describe("Strategy scenario: general link", () => {
  test("toggling Fobles decorates and restores the general link field", async ({ page }, testInfo) => {
    const testContext: StrategyTestContext = await factoryStrategyTestContext(
      page,
      SCENARIO,
      testInfo
    );

    await stepExpectSitecoreInitialConditions(testContext);

    await testContext.step("Toggle Fobles on: the field gets a Fobles button", async () => {
      await clickLbolt(page);
      await expect(testContext.locatorFirstResult).toHaveClass(FOBLES_HIDDEN_CLASS_PATTERN);
      const foblesButton = testContext.fieldTable.locator(CONST.FOBLES.SELECTORS.BUTTON).first();
      await expect(foblesButton).toBeVisible();
      await expect(foblesButton).toHaveText(SCENARIO.expectedButtonText);
      await page.waitForTimeout(STEP_WAIT_MS);
    });

    runClickNavigationSteps(testContext.step, page, testInfo, testContext.fieldTable,  testContext.locatorFirstResult, SCENARIO);
  });
});
