import { expect, test } from "../fixtures/playwright";
import { CONST } from "../CONST";
import {
  createStep,
  getEditorSectionLocator,
  setupContentEditorForTesting,
} from "../fobles-helpers";

import { fieldScreenshotName, FOBLES_HIDDEN_CLASS_PATTERN } from "./support/CONST";
import { STRATEGY_SCENARIOS } from "./support/strategy-scenarios";
import { clickLbolt } from "../macros/fobles-macros";
import type { StrategyTestContext } from "./support/scenario.types";
import { factoryStrategyTestContext } from "../strategy-test-context";
import { foblesWaitForTimeout } from "../helpers/wait-helpers";
import { showBillboard } from "../billboard";
import { runClickNavigationSteps } from "./click-navigation-steps";
import { stepExpectSitecoreInitialConditions, stepExpectFoblesInitialConditions, stepExpectFoblesOnConditions, stepExpectFoblesCtrlClick, stepExpectFoblesOffConditions } from "./support/strategy-test-helper";

const STEP_WAIT_MS = CONST.SPEED.SETTINGS[CONST.SPEED.SELECTED].STEP_WAIT_MS;

// Tag List replaces TWO panes independently (src/content/features/augmentor/field-strategies
// /sc-taglist.ts): the "all items" tree pane and the "selected items" select pane, each getting
// its own [data-fobles-wrapper]. This test focuses on the selected-items pane (the field's actual
// stored value) and only sanity-checks that the all-items pane also gets wrapped.
const SCENARIO = STRATEGY_SCENARIOS.TAG_LIST;

// Skipped - see docs/TODO.md "Strategy Tag List field doesn't render the real Tag List widget".
test.describe.skip("Strategy scenario: tag list", () => {
  test("toggling Fobles decorates and restores the tag list field", async ({ page }, testInfo) => {

    await setupContentEditorForTesting(page, STRATEGY_SCENARIOS.DROP_LINK);

    await showBillboard(page, STRATEGY_SCENARIOS.DROP_LINK.friendlyName);
    const testContext: StrategyTestContext = await factoryStrategyTestContext(page, STRATEGY_SCENARIOS.DROP_LINK, testInfo);

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
