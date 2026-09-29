import { expect, test } from "../fixtures/playwright";
import { CONST } from "../CONST";
import {
  createStep,
  getEditorSectionLocator,
} from "../fobles-helpers";

import { FOBLES_HIDDEN_CLASS_PATTERN } from "./support/CONST";
import { runClickNavigationSteps } from "./click-navigation-steps";
import { STRATEGY_SCENARIOS } from "./support/strategy-scenarios";
import { clickLbolt } from "../macros/fobles-macros";
import type { StrategyTestContext } from "./support/scenario.types";
import { factoryStrategyTestContext } from "../strategy-test-context";

const STEP_WAIT_MS = CONST.SPEED.SETTINGS[CONST.SPEED.SELECTED].STEP_WAIT_MS;

// Multilist replaces a single pane (the selected-items select), with one button per selected
// option (src/content/features/augmentor/field-strategies/sc-multilist.ts) - unlike Tag List,
// which replaces two separate panes.
const SCENARIO = STRATEGY_SCENARIOS.MULTILIST_OPTIONS;

test.describe("Strategy scenario: multilist", () => {
  test("toggling Fobles decorates and restores the multilist field", async ({ page }, testInfo) => {
    const testContext: StrategyTestContext = await factoryStrategyTestContext(
      page,
      SCENARIO
    );
    // Multilist renders two select boxes sharing this class (the "All"/unselected pane and the
    // "Selected" pane) - Fobles only wraps the selected-items one, so target it specifically
    // rather than .first(), which resolves to the unselected pane instead.
    // const select = testContext.fieldTable.locator(CONST.SITECORE.SELECTORS.STRATEGIES.MULTILIST).first();
    const step = createStep(page, testInfo, getEditorSectionLocator(testContext.fieldTable), SCENARIO.friendlyName);

    await step("Default stage: field renders as a plain Sitecore multilist", async () => {
      await expect(testContext.locatorFirstResult).toBeVisible();
      await expect(testContext.fieldTable.locator(CONST.FOBLES.SELECTORS.WRAPPER)).toHaveCount(0);
      await foblesWaitForTimeout(page, STEP_WAIT_MS);
    });

    await step("Toggle Fobles on: the field gets one Fobles button", async () => {
      await clickLbolt(page);
      await expect(testContext.locatorFirstResult).toHaveClass(FOBLES_HIDDEN_CLASS_PATTERN);
      await expect(testContext.fieldTable.locator(CONST.FOBLES.SELECTORS.WRAPPER)).toHaveCount(1);

      const foblesButtons = testContext.fieldTable.locator(CONST.FOBLES.SELECTORS.BUTTON);
      await expect(foblesButtons).toHaveCount(1);
      await expect(foblesButtons.first()).toHaveText(SCENARIO.expectedButtonText);
      await foblesWaitForTimeout(page, STEP_WAIT_MS);
    });

    runClickNavigationSteps(step, page, testInfo, testContext.fieldTable, testContext.locatorFirstResult, SCENARIO);
  });
});
