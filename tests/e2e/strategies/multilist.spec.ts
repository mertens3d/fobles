import { expect, test } from "../fixtures/playwright";
import { CONST } from "../CONST";
import {
  activateFoblesForFieldStrategy,
  clickLboltButton,
  createStep,
  expectFoblesButtonNewTabNavigation,
  expectFoblesButtonSameTabNavigation,
  getEditorSectionLocator,
} from "../fobles-helpers";
import { FOBLES, FOBLES_HIDDEN_CLASS_PATTERN } from "./CONST";

const STEP_WAIT_MS = CONST.SPEED.SETTINGS[CONST.SPEED.SELECTED].STEP_WAIT_MS;

// "Strategy multilist" test content item (tests/items-folbles) - Strategy Multilist 1x field,
// referencing the shared "Fobles Data Item A" item. Multilist replaces a single pane (the selected
// -items select), with one button per selected option (src/content/features/augmentor/field-
// strategies/sc-multilist.ts) - unlike Tag List, which replaces two separate panes.
const MULTILIST_ITEM_ID = "718293a4-b5c6-4ad7-8be8-f90a1b2c3d4e";
const MULTILIST_FIELD_LABEL = "Strategy Multilist 1x";
const EXPECTED_FOBLES_BUTTON_TEXT = "Fobles Data Item A";
// The selected item's own ID (tests/items-folbles/.../Field Data/List 1x/Fobles Data Item A).
const SELECTED_ITEM_ID = "{2CAAAD6C-31B1-4672-9576-C408177DC2DB}";

test.describe("Strategy scenario: multilist", () => {
  test("toggling Fobles decorates and restores the multilist field", async ({ page }, testInfo) => {
    const { fieldTable, lboltButton } = await activateFoblesForFieldStrategy(
      page,
      MULTILIST_ITEM_ID,
      MULTILIST_FIELD_LABEL,
    );
    // Multilist renders two select boxes sharing this class (the "All"/unselected pane and the
    // "Selected" pane) - Fobles only wraps the selected-items one, so target it specifically
    // rather than .first(), which resolves to the unselected pane instead.
    const select = fieldTable.locator("select.scContentControlMultilistBox[id$='_selected']").first();
    const step = createStep(page, testInfo, getEditorSectionLocator(fieldTable), "Multilist");

    await step("Default stage: field renders as a plain Sitecore multilist", async () => {
      await expect(select).toBeVisible();
      await expect(fieldTable.locator(FOBLES.SELECTORS.WRAPPER)).toHaveCount(0);
      await page.waitForTimeout(STEP_WAIT_MS);
    });

    await step("Toggle Fobles on: the field gets one Fobles button", async () => {
      await clickLboltButton(page, lboltButton);
      await expect(select).toHaveClass(FOBLES_HIDDEN_CLASS_PATTERN);
      await expect(fieldTable.locator(FOBLES.SELECTORS.WRAPPER)).toHaveCount(1);

      const foblesButtons = fieldTable.locator(FOBLES.SELECTORS.BUTTON);
      await expect(foblesButtons).toHaveCount(1);
      await expect(foblesButtons.first()).toHaveText(EXPECTED_FOBLES_BUTTON_TEXT);
      await page.waitForTimeout(STEP_WAIT_MS);
    });

    await step(`Ctrl+click: opens the target item in a new tab: "${SELECTED_ITEM_ID}"`, async () => {
      const foblesButton = fieldTable.locator(FOBLES.SELECTORS.BUTTON).first();
      await expectFoblesButtonNewTabNavigation(page, testInfo, foblesButton, SELECTED_ITEM_ID);
    }, { screenshot: false });

    await step("Toggle Fobles off: the field returns to its original shape", async () => {
      await clickLboltButton(page, lboltButton);
      await expect(select).not.toHaveClass(FOBLES_HIDDEN_CLASS_PATTERN);
      await expect(select).not.toHaveAttribute(FOBLES.ATTRIBUTES.PROCESSED, "1");
      await expect(fieldTable.locator(FOBLES.SELECTORS.WRAPPER)).toHaveCount(0);
    });

    // Toggle back on to reveal the button again for the click test below - no screenshot needed,
    // already captured above.
    await clickLboltButton(page, lboltButton);

    await step(`Click navigates to the target item: "${SELECTED_ITEM_ID}"`, async () => {
      const foblesButton = fieldTable.locator(FOBLES.SELECTORS.BUTTON).first();
      await expectFoblesButtonSameTabNavigation(page, testInfo, foblesButton, SELECTED_ITEM_ID);
    }, { screenshot: false });
  });
});
