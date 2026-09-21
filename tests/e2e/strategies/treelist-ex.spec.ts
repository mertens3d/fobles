import { expect, test } from "../fixtures/playwright";
import { CONST } from "../CONST";
import {
  activateFoblesForFieldStrategy,
  createStep,
  getEditorSectionLocator,
} from "../fobles-helpers";
import { clickLboltButton } from "../sitecore-macros";
import { FOBLES, FOBLES_HIDDEN_CLASS_PATTERN } from "./CONST";
import { runClickNavigationSteps } from "./click-navigation-steps";
import { STRATEGY_SCENARIOS } from "./strategy-scenarios";

const STEP_WAIT_MS = CONST.SPEED.SETTINGS[CONST.SPEED.SELECTED].STEP_WAIT_MS;

// Treelist Ex has a single host element (div.scContentControl.scTreelistEx) that IS the pane -
// each selected item is a direct child <div title="{resolved path}">{label}</div>
// (src/content/features/augmentor/field-strategies/sc-treelistex.ts) - unlike Drop Tree/Multilist,
// the field's stored value is a GUID but the navigation target Fobles reads is the resolved path
// from that title attribute.
const SCENARIO = STRATEGY_SCENARIOS.TREELIST_EX;

test.describe("Strategy scenario: treelist ex", () => {
  test("toggling Fobles decorates and restores the treelist ex field", async ({ page }, testInfo) => {
    const { fieldTable, lboltButton } = await activateFoblesForFieldStrategy(
      page,
      SCENARIO.itemId,
      SCENARIO.fieldLabel,
    );
    const host = fieldTable.locator("div.scContentControl.scTreelistEx").first();
    const step = createStep(page, testInfo, getEditorSectionLocator(fieldTable), "Treelist Ex");

    await step("Default stage: field renders as a plain Sitecore treelist ex", async () => {
      await expect(host).toBeVisible();
      await expect(fieldTable.locator(FOBLES.SELECTORS.WRAPPER)).toHaveCount(0);
      await page.waitForTimeout(STEP_WAIT_MS);
    });

    await step("Toggle Fobles on: the field gets a Fobles button", async () => {
      await clickLboltButton(page, lboltButton);
      await expect(host).toHaveClass(FOBLES_HIDDEN_CLASS_PATTERN);
      const foblesButton = fieldTable.locator(FOBLES.SELECTORS.BUTTON).first();
      await expect(foblesButton).toBeVisible();
      await expect(foblesButton).toHaveText(SCENARIO.expectedButtonText);
      await page.waitForTimeout(STEP_WAIT_MS);
    });

    await runClickNavigationSteps(step, page, testInfo, fieldTable, lboltButton, host, SCENARIO);
  });
});
