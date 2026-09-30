import { expect, foblesTest } from "../../fixtures/playwright";
import { CONST } from "../../CONST";
import {
  setupContentEditorForTesting,
} from "../../helpers/fobles-helpers";

import { fieldScreenshotName } from "./support/CONST";
import { STRATEGY_SCENARIOS } from "./support/strategy-scenarios";
import type { StrategyTestContext } from "./support/scenario.types";
import { factoryStrategyTestContext } from "../../helpers/strategy-test-context";
import { showBillboard } from "../../helpers/billboard";
import { runClickNavigationSteps } from "./click-navigation-steps";
import { stepExpectSitecoreInitialConditions, stepExpectFoblesInitialConditions, stepExpectFoblesOnConditions, stepExpectFoblesCtrlClick, stepExpectFoblesOffConditions } from "./support/strategy-test-helper";

const STEP_WAIT_MS = CONST.TESTING.SPEED.SETTINGS[CONST.TESTING.SPEED.SELECTED].STEP_WAIT_MS;

// Tag List replaces TWO panes independently (src/content/features/augmentor/field-strategies
// /sc-taglist.ts): the "all items" tree pane and the "selected items" select pane, each getting
// its own [data-fobles-wrapper]. This test focuses on the selected-items pane (the field's actual
// stored value) and only sanity-checks that the all-items pane also gets wrapped.
const SCENARIO = STRATEGY_SCENARIOS.TAG_LIST;

// Skipped - see docs/TODO.md "Strategy Tag List field doesn't render the real Tag List widget".
foblesTest.describe.skip("Strategy scenario: tag list", () => {
  foblesTest("toggling Fobles decorates and restores the tag list field", async ({ page }, testInfo) => {

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
