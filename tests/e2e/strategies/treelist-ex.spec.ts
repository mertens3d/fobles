import { expect, foblesTest } from "../../fixtures/playwright";
import { CONST } from "../../CONST";
import { factoryStrategyTestContext } from "../../helpers/strategy-test-context";
import {
  setupContentEditorForTesting,
} from "../../helpers/fobles-helpers-support/test-setup";

import { fieldScreenshotName } from "./support/CONST";
import { runClickNavigationSteps } from "./click-navigation-steps";
import { STRATEGY_SCENARIOS } from "./support/strategy-scenarios";
import type { StrategyTestContext } from "./support/scenario.types";
import { showBillboard } from "../../helpers/billboard";
import { stepExpectSitecoreInitialConditions, stepExpectFoblesInitialConditions, stepExpectFoblesOnConditions, stepExpectFoblesCtrlClick, stepExpectFoblesOffConditions } from "./support/strategy-test-helper";

const STEP_WAIT_MS = CONST.TESTING.SPEED.SETTINGS[CONST.TESTING.SPEED.SELECTED].STEP_WAIT_MS;

// Treelist Ex has a single host element (div.scContentControl.scTreelistEx) that IS the pane -
// each selected item is a direct child <div title="{resolved path}">{label}</div>
// (src/content/features/augmentor/field-strategies/sc-treelistex.ts) - unlike Drop Tree/Multilist,
// the field's stored value is a GUID but the navigation target Fobles reads is the resolved path
// from that title attribute.
const SCENARIO = STRATEGY_SCENARIOS.TREELIST_EX;

foblesTest.describe("Strategy scenario: treelist ex", () => {
  foblesTest("toggling Fobles decorates and restores the treelist ex field", async ({ page }, testInfo) => {

    await setupContentEditorForTesting(page, STRATEGY_SCENARIOS.TREELIST_EX);

    await showBillboard(page, STRATEGY_SCENARIOS.TREELIST_EX.friendlyName);
    const testContext: StrategyTestContext = await factoryStrategyTestContext(page, STRATEGY_SCENARIOS.TREELIST_EX, testInfo);

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
    // // const host = testContext.fieldTable.locator(CONST.SITECORE.SELECTORS.STRATEGIES.TREELISTEX).first();
    // const step = createStep(page, testInfo, getEditorSectionLocator(testContext.fieldTable), SCENARIO.friendlyName);

    // await step("Default stage: field renders as a plain Sitecore treelist ex", async () => {
    //   await expect(testContext.locatorFirstResult).toBeVisible();
    //   await expect(testContext.fieldTable.locator(CONST.FOBLES.SELECTORS.WRAPPER)).toHaveCount(0);
    //   await foblesWaitForTimeout(page, STEP_WAIT_MS);
    // });

    // await step("Toggle Fobles on: the field gets a Fobles button", async () => {
    //   await clickLbolt(page);
    //   await expect(testContext.locatorFirstResult).toHaveClass(FOBLES_HIDDEN_CLASS_PATTERN);
    //   const foblesButton = testContext.fieldTable.locator(CONST.FOBLES.SELECTORS.BUTTON).first();
    //   await expect(foblesButton).toBeVisible();
    //   await expect(foblesButton).toHaveText(SCENARIO.expectedButtonText);
    //   await foblesWaitForTimeout(page, STEP_WAIT_MS);
    // });

    // runClickNavigationSteps(step, page, testInfo, testContext.fieldTable,  testContext.locatorFirstResult, SCENARIO);
  });
});
