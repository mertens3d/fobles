import { foblesTest } from "../../fixtures/playwright";
import { CONST } from "../../CONST";
import { factoryStrategyTestContext } from "../../helpers/strategy-test-context";
import { createStep } from "../../helpers/fobles-helpers-support/test-step";
import {
  getEditorSectionLocator,
  setupContentEditorForTesting,
} from "../../helpers/fobles-helpers-support/test-setup";
import { STRATEGY_SCENARIOS } from "./support/strategy-scenarios";
import type { StrategyTestContext } from "./support/scenario.types";
import { showBillboard } from "../../helpers/billboard";
import { stepExpectFoblesInitialConditions, stepExpectSitecoreInitialConditions } from "./support/strategy-test-helper";

const STEP_WAIT_MS = CONST.TESTING.SPEED.SETTINGS[CONST.TESTING.SPEED.SELECTED].STEP_WAIT_MS;

// Droplist renders the same select.scContentControl.scCombobox markup as Droplink, but Sitecore
// stores/renders only the chosen value's plain name text for it, never an item GUID - there's no
// navigation target Fobles could ever expose, so sc-droplist.ts leaves genuine Droplist fields
// completely untouched (no hidden class, no wrapper, no button). This test only asserts that
// no-op, unlike every other strategy spec.
const SCENARIO = STRATEGY_SCENARIOS.DROP_LIST;

foblesTest.describe("Strategy scenario: droplist", () => {
  foblesTest("Fobles leaves the droplist field untouched", async ({ page }, testInfo) => {
    await setupContentEditorForTesting(page, STRATEGY_SCENARIOS.DROP_LIST);
    await showBillboard(page, STRATEGY_SCENARIOS.DROP_LIST.friendlyName);

    const testContext: StrategyTestContext = await factoryStrategyTestContext(
      page,
      SCENARIO,
      testInfo
    );
    // const select = testContext.fieldTable.locator(CONST.SITECORE.SELECTORS.STRATEGIES.DROP_LIST).first();
    const step = createStep(page, testInfo, getEditorSectionLocator(testContext.fieldTable), SCENARIO.friendlyName);


    await stepExpectSitecoreInitialConditions(testContext);
    await stepExpectFoblesInitialConditions(testContext);
    //await stepExpectFoblesOnConditions(testContext);
    //await stepExpectFoblesOffConditions(testContext);
    // await step("Default stage: field renders as a plain Sitecore select", async () => {
    //   await expect(testContext.locatorFirstResult).toBeVisible();
    //   await expect(testContext.fieldTable.locator(CONST.FOBLES.SELECTORS.WRAPPER)).toHaveCount(0);
    //   await foblesWaitForTimeout(page, STEP_WAIT_MS);
    // });

    // await step("Toggle Fobles on: the field has no navigable value, so nothing changes", async () => {
    //   await clickLbolt(page);
    //   await expect(testContext.locatorFirstResult).toBeVisible();
    //   await expect(testContext.fieldTable.locator(CONST.FOBLES.SELECTORS.WRAPPER)).toHaveCount(0);
    //   await expect(testContext.fieldTable.locator(CONST.FOBLES.SELECTORS.BUTTON)).toHaveCount(0);
    //   await foblesWaitForTimeout(page, STEP_WAIT_MS);
    // });
  });
});
