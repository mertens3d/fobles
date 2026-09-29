import { expect, test } from "../fixtures/playwright";
import { showBillboard } from "../billboard";
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
import { stepExpectFoblesCtrlClick, stepExpectFoblesInitialConditions, stepExpectFoblesOffConditions, stepExpectFoblesOnConditions, stepExpectSitecoreInitialConditions } from "./support/strategy-test-helper";

const STEP_WAIT_MS = CONST.SPEED.SETTINGS[CONST.SPEED.SELECTED].STEP_WAIT_MS;

// Drop Tree's readonly combobox-edit input renders Sitecore's resolved display name (not the raw
// GUID), and its button has no strategy variant class - just the base "fobles-button"
// (src/content/features/augmentor/field-strategies/sc-droptree.ts).
const SCENARIO = STRATEGY_SCENARIOS.DROP_TREE;

test.describe("Strategy scenario: drop tree", () => {
  test("toggling Fobles decorates and restores the drop tree field", async ({ page }, testInfo) => {

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
