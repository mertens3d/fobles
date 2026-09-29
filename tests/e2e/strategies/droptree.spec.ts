import { expect, test } from "../fixtures/playwright";
import { CONST } from "../CONST";
import { factoryStrategyTestContext } from "../strategy-test-context";
import {
  createStep,
  getEditorSectionLocator,
} from "../fobles-helpers";
import { FOBLES_HIDDEN_CLASS_PATTERN } from "./support/CONST";
import { runClickNavigationSteps } from "./click-navigation-steps";
import { STRATEGY_SCENARIOS } from "./support/strategy-scenarios";
import { clickLbolt } from "../macros/fobles-macros";
import type { StrategyTestContext } from "./support/scenario.types";

const STEP_WAIT_MS = CONST.SPEED.SETTINGS[CONST.SPEED.SELECTED].STEP_WAIT_MS;

// Drop Tree's readonly combobox-edit input renders Sitecore's resolved display name (not the raw
// GUID), and its button has no strategy variant class - just the base "fobles-button"
// (src/content/features/augmentor/field-strategies/sc-droptree.ts).
const SCENARIO = STRATEGY_SCENARIOS.DROP_TREE;

test.describe("Strategy scenario: drop tree", () => {
  test("toggling Fobles decorates and restores the drop tree field", async ({ page }, testInfo) => {
    const testContext: StrategyTestContext = await factoryStrategyTestContext(
      page,
      SCENARIO,
      testInfo
    );
    // const input =testContext. fieldTable.locator(CONST.SITECORE.SELECTORS.STRATEGIES.DROP_TREE).first();
    const step = createStep(page, testInfo, getEditorSectionLocator(testContext.fieldTable), SCENARIO.friendlyName);

    await step("Default stage: field renders as a plain Sitecore combobox-edit input", async () => {
      await expect(testContext.locatorFirstResult).toBeVisible();
      await expect(testContext.fieldTable.locator(CONST.FOBLES.SELECTORS.WRAPPER)).toHaveCount(0);
      await foblesWaitForTimeout(page, STEP_WAIT_MS);
    });

    await step("Toggle Fobles on: the field gets a Fobles button", async () => {
      await clickLbolt(page);
      await expect(testContext.locatorFirstResult).toHaveClass(FOBLES_HIDDEN_CLASS_PATTERN);
      const foblesButton = testContext.fieldTable.locator(CONST.FOBLES.SELECTORS.BUTTON).first();
      await expect(foblesButton).toBeVisible();
      await expect(foblesButton).toHaveText(SCENARIO.expectedButtonText);
      await foblesWaitForTimeout(page, STEP_WAIT_MS);
    });

    await runClickNavigationSteps(step, page, testInfo, testContext.fieldTable, testContext.locatorFirstResult, SCENARIO);
  });
});
