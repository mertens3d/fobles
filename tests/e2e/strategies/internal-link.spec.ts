import { expect, test } from "../fixtures/playwright";
import { CONST } from "../CONST";
import { factoryStrategyTestContext } from "../strategy-test-context";
import {
  createStep,
  getEditorSectionLocator,
  setupContentEditorForTesting,
} from "../fobles-helpers";

import { fieldScreenshotName, FOBLES_HIDDEN_CLASS_PATTERN } from "./support/CONST";
import { runClickNavigationSteps } from "./click-navigation-steps";
import { STRATEGY_SCENARIOS } from "./support/strategy-scenarios";
import { clickLbolt } from "../macros/fobles-macros";
import type { StrategyTestContext } from "./support/scenario.types";
import { foblesWaitForTimeout } from "../helpers/wait-helpers";
import { showBillboard } from "../billboard";
import { stepExpectSitecoreInitialConditions, stepExpectFoblesInitialConditions, stepExpectFoblesOnConditions, stepExpectFoblesCtrlClick, stepExpectFoblesOffConditions } from "./support/strategy-test-helper";

const STEP_WAIT_MS = CONST.SPEED.SETTINGS[CONST.SPEED.SELECTED].STEP_WAIT_MS;

// Internal Link fields have no getButtonText override (src/content/features/augmentor/shared
// /apply-single-input-field.ts), so the button shows the raw stored value, not a resolved item
// name.
const SCENARIO = STRATEGY_SCENARIOS.INTERNAL_LINK;

test.describe("Strategy scenario: internal link", () => {
  test("toggling Fobles decorates and restores the internal link field", async ({ page }, testInfo) => {
  await setupContentEditorForTesting(page,STRATEGY_SCENARIOS.INTERNAL_LINK);
      
      await showBillboard(page, STRATEGY_SCENARIOS.INTERNAL_LINK.friendlyName);
      const testContext: StrategyTestContext = await factoryStrategyTestContext(page, STRATEGY_SCENARIOS.INTERNAL_LINK, testInfo);
  
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
