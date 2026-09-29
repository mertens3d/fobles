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
import { foblesWaitForTimeout } from "../helpers/wait-helpers";

const STEP_WAIT_MS = CONST.SPEED.SETTINGS[CONST.SPEED.SELECTED].STEP_WAIT_MS;

// Treelist Ex has a single host element (div.scContentControl.scTreelistEx) that IS the pane -
// each selected item is a direct child <div title="{resolved path}">{label}</div>
// (src/content/features/augmentor/field-strategies/sc-treelistex.ts) - unlike Drop Tree/Multilist,
// the field's stored value is a GUID but the navigation target Fobles reads is the resolved path
// from that title attribute.
const SCENARIO = STRATEGY_SCENARIOS.TREELIST_EX;

test.describe("Strategy scenario: treelist ex", () => {
  test("toggling Fobles decorates and restores the treelist ex field", async ({ page }, testInfo) => {
    const testContext: StrategyTestContext = await factoryStrategyTestContext(
      page,
      SCENARIO,
      testInfo
    );
    // const host = testContext.fieldTable.locator(CONST.SITECORE.SELECTORS.STRATEGIES.TREELISTEX).first();
    const step = createStep(page, testInfo, getEditorSectionLocator(testContext.fieldTable), SCENARIO.friendlyName);

    await step("Default stage: field renders as a plain Sitecore treelist ex", async () => {
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

    runClickNavigationSteps(step, page, testInfo, testContext.fieldTable,  testContext.locatorFirstResult, SCENARIO);
  });
});
