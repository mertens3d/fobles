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

// "Strategy droptree" test content item (tests/items-folbles) - Strategy DropTree 1x field,
// referencing the shared "Fobles Data Item A" item. Drop Tree's readonly combobox-edit input
// renders Sitecore's resolved display name (not the raw GUID), and its button has no strategy
// variant class - just the base "fobles-button" (src/content/features/augmentor/field-strategies
// /sc-droptree.ts).
const DROPTREE_ITEM_ID = "3e4f5a6b-7c8d-4e9f-8a0b-c2d3e4f5a6b7";
const DROPTREE_FIELD_LABEL = "Strategy DropTree 1x";
// Drop Tree's button shows the full resolved path, not just the item's leaf name.
const EXPECTED_FOBLES_BUTTON_TEXT = "Fobles Testing - (ok to delete)/Field Data/List 1x/Fobles Data Item A";
// Drop Tree's readonly input holds the resolved display path (not the item's GUID), so that's
// what Fobles reads as the navigation target too - unlike Droplink's real <select>, whose option
// values are GUIDs.
const SELECTED_ITEM_PATH = `/sitecore/${EXPECTED_FOBLES_BUTTON_TEXT}`;

test.describe("Strategy scenario: drop tree", () => {
  test("toggling Fobles decorates and restores the drop tree field", async ({ page }, testInfo) => {
    const { fieldTable, lboltButton } = await activateFoblesForFieldStrategy(
      page,
      DROPTREE_ITEM_ID,
      DROPTREE_FIELD_LABEL,
    );
    const input = fieldTable.locator("input.scComboboxEdit[readonly]").first();
    const step = createStep(page, testInfo, getEditorSectionLocator(fieldTable), "Drop Tree");

    await step("Default stage: field renders as a plain Sitecore combobox-edit input", async () => {
      await expect(input).toBeVisible();
      await expect(fieldTable.locator(FOBLES.SELECTORS.WRAPPER)).toHaveCount(0);
      await page.waitForTimeout(STEP_WAIT_MS);
    });

    await step("Toggle Fobles on: the field gets a Fobles button", async () => {
      await clickLboltButton(page, lboltButton);
      await expect(input).toHaveClass(FOBLES_HIDDEN_CLASS_PATTERN);
      const foblesButton = fieldTable.locator(FOBLES.SELECTORS.BUTTON).first();
      await expect(foblesButton).toBeVisible();
      await expect(foblesButton).toHaveText(EXPECTED_FOBLES_BUTTON_TEXT);
      await page.waitForTimeout(STEP_WAIT_MS);
    });

    await step(`Ctrl+click: opens the target item in a new tab: "${SELECTED_ITEM_PATH}"`, async () => {
      const foblesButton = fieldTable.locator(FOBLES.SELECTORS.BUTTON).first();
      await expectFoblesButtonNewTabNavigation(page, testInfo, foblesButton, SELECTED_ITEM_PATH);
    }, { screenshot: false });

    await step("Toggle Fobles off: the field returns to its original shape", async () => {
      await clickLboltButton(page, lboltButton);
      await expect(input).not.toHaveClass(FOBLES_HIDDEN_CLASS_PATTERN);
      await expect(input).not.toHaveAttribute(FOBLES.ATTRIBUTES.PROCESSED, "1");
      await expect(fieldTable.locator(FOBLES.SELECTORS.WRAPPER)).toHaveCount(0);
    });

    // Toggle back on to reveal the button again for the click test below - no screenshot needed,
    // already captured above.
    await clickLboltButton(page, lboltButton);

    await step(`Click navigates to the target item: "${SELECTED_ITEM_PATH}"`, async () => {
      const foblesButton = fieldTable.locator(FOBLES.SELECTORS.BUTTON).first();
      await expectFoblesButtonSameTabNavigation(page, testInfo, foblesButton, SELECTED_ITEM_PATH);
    }, { screenshot: false });
  });
});
