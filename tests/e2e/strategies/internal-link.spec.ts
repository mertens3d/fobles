import { expect, test } from "../fixtures/playwright";
import { CONST } from "../CONST";
import { factoryStrategyTestContext } from "../strategy-test-context";
import {
  createStep,
  getEditorSectionLocator,
} from "../fobles-helpers";

import { FOBLES_HIDDEN_CLASS_PATTERN } from "./CONST";
import { runClickNavigationSteps } from "./click-navigation-steps";
import { STRATEGY_SCENARIOS } from "./strategy-scenarios";
import { clickLbolt } from "../macros/fobles-macros";
import type { StrategyTestContext } from "./scenario.types";

const STEP_WAIT_MS = CONST.SPEED.SETTINGS[CONST.SPEED.SELECTED].STEP_WAIT_MS;

// Internal Link fields have no getButtonText override (src/content/features/augmentor/shared
// /apply-single-input-field.ts), so the button shows the raw stored value, not a resolved item
// name.
const SCENARIO = STRATEGY_SCENARIOS.INTERNAL_LINK;

test.describe("Strategy scenario: internal link", () => {
  test("toggling Fobles decorates and restores the internal link field", async ({ page }, testInfo) => {
    const testContext: StrategyTestContext = await factoryStrategyTestContext(
      page,
      SCENARIO,
      testInfo
    );
    
    const step = createStep(page, testInfo, getEditorSectionLocator(testContext.fieldTable), SCENARIO.friendlyName);

    await step("Default stage: field renders as a plain Sitecore input", async () => {
      await expect(testContext.locatorFirstResult).toBeVisible();
      await expect(testContext.fieldTable.locator(CONST.FOBLES.SELECTORS.WRAPPER)).toHaveCount(0);
      await page.waitForTimeout(STEP_WAIT_MS);
    });

    await step("Toggle Fobles on: the field gets a Fobles button", async () => {
      await clickLbolt(page);
      await expect(testContext.locatorFirstResult).toHaveClass(FOBLES_HIDDEN_CLASS_PATTERN);
      const foblesButton = testContext.fieldTable.locator(CONST.FOBLES.SELECTORS.BUTTON).first();
      await expect(foblesButton).toBeVisible();
      await expect(foblesButton).toHaveText(SCENARIO.expectedButtonText);
      await page.waitForTimeout(STEP_WAIT_MS);
    });

    runClickNavigationSteps(step, page, testInfo, testContext.fieldTable, testContext.locatorFirstResult, SCENARIO);
  });
});
