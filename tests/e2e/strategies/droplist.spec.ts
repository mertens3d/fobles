import { expect, test } from "../fixtures/playwright";
import { CONST } from "../CONST";
import { factoryStrategyTestContext } from "../strategy-test-context";
import {
  createStep,
  getEditorSectionLocator,
} from "../fobles-helpers";
import { STRATEGY_SCENARIOS } from "./support/strategy-scenarios";
import { clickLbolt } from "../macros/fobles-macros";
import type { StrategyTestContext } from "./support/scenario.types";

const STEP_WAIT_MS = CONST.SPEED.SETTINGS[CONST.SPEED.SELECTED].STEP_WAIT_MS;

// Droplist renders the same select.scContentControl.scCombobox markup as Droplink, but Sitecore
// stores/renders only the chosen value's plain name text for it, never an item GUID - there's no
// navigation target Fobles could ever expose, so sc-droplist.ts leaves genuine Droplist fields
// completely untouched (no hidden class, no wrapper, no button). This test only asserts that
// no-op, unlike every other strategy spec.
const SCENARIO = STRATEGY_SCENARIOS.DROP_LIST;

test.describe("Strategy scenario: droplist", () => {
  test("Fobles leaves the droplist field untouched", async ({ page }, testInfo) => {
    const testContext: StrategyTestContext = await factoryStrategyTestContext(
      page,
      SCENARIO,
      testInfo
    );
    // const select = testContext.fieldTable.locator(CONST.SITECORE.SELECTORS.STRATEGIES.DROP_LIST).first();
    const step = createStep(page, testInfo, getEditorSectionLocator(testContext.fieldTable), SCENARIO.friendlyName);

    await step("Default stage: field renders as a plain Sitecore select", async () => {
      await expect(testContext.locatorFirstResult).toBeVisible();
      await expect(testContext.fieldTable.locator(CONST.FOBLES.SELECTORS.WRAPPER)).toHaveCount(0);
      await foblesWaitForTimeout(page, STEP_WAIT_MS);
    });

    await step("Toggle Fobles on: the field has no navigable value, so nothing changes", async () => {
      await clickLbolt(page);
      await expect(testContext.locatorFirstResult).toBeVisible();
      await expect(testContext.fieldTable.locator(CONST.FOBLES.SELECTORS.WRAPPER)).toHaveCount(0);
      await expect(testContext.fieldTable.locator(CONST.FOBLES.SELECTORS.BUTTON)).toHaveCount(0);
      await foblesWaitForTimeout(page, STEP_WAIT_MS);
    });
  });
});
