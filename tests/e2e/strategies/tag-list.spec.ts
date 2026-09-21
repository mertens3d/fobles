import { expect, test } from "../fixtures/playwright";
import { CONST } from "../CONST";
import {
  activateFoblesForFieldStrategy,
  createStep,
  getEditorSectionLocator,
} from "../fobles-helpers";
import { clickLboltButton } from "../sitecore-macros";
import { FOBLES, FOBLES_HIDDEN_CLASS_PATTERN } from "./CONST";
import { STRATEGY_SCENARIOS } from "./strategy-scenarios";

const STEP_WAIT_MS = CONST.SPEED.SETTINGS[CONST.SPEED.SELECTED].STEP_WAIT_MS;

// Tag List replaces TWO panes independently (src/content/features/augmentor/field-strategies
// /sc-taglist.ts): the "all items" tree pane and the "selected items" select pane, each getting
// its own [data-fobles-wrapper]. This test focuses on the selected-items pane (the field's actual
// stored value) and only sanity-checks that the all-items pane also gets wrapped.
const SCENARIO = STRATEGY_SCENARIOS.TAG_LIST;

// Skipped - see docs/TODO.md "Strategy Tag List field doesn't render the real Tag List widget".
test.describe.skip("Strategy scenario: tag list", () => {
  test("toggling Fobles decorates and restores the tag list field", async ({ page }, testInfo) => {
    const { fieldTable, lboltButton } = await activateFoblesForFieldStrategy(
      page,
      SCENARIO.itemId,
      SCENARIO.fieldLabel,
    );
    const selectedPane = fieldTable.locator("select.scContentControlMultilistBox").first();
    const step = createStep(page, testInfo, getEditorSectionLocator(fieldTable), "Tag List");

    await step("Default stage: field renders as a plain Sitecore tag list", async () => {
      await expect(selectedPane).toBeVisible();
      await expect(fieldTable.locator(FOBLES.SELECTORS.WRAPPER)).toHaveCount(0);
      await page.waitForTimeout(STEP_WAIT_MS);
    });

    await step("Toggle Fobles on: both panes get Fobles wrappers", async () => {
      await clickLboltButton(page, lboltButton);
      await expect(selectedPane).toHaveClass(FOBLES_HIDDEN_CLASS_PATTERN);
      await expect(fieldTable.locator(FOBLES.SELECTORS.WRAPPER)).toHaveCount(2);

      const selectedPaneButton = fieldTable
        .locator(`select.scContentControlMultilistBox + ${FOBLES.SELECTORS.WRAPPER} ${FOBLES.SELECTORS.BUTTON}`)
        .first();
      await expect(selectedPaneButton).toBeVisible();
      await expect(selectedPaneButton).toHaveText(SCENARIO.expectedButtonText);
      await page.waitForTimeout(STEP_WAIT_MS);
    });

    await step("Toggle Fobles off: the field returns to its original shape", async () => {
      await clickLboltButton(page, lboltButton);
      await expect(selectedPane).not.toHaveClass(FOBLES_HIDDEN_CLASS_PATTERN);
      await expect(fieldTable.locator(FOBLES.SELECTORS.WRAPPER)).toHaveCount(0);
    });
  });
});
