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

// "Strategy general link" test content item (tests/items-folbles) - Strategy General Link
// Internal field. Sitecore's General Link editor control resolves an internal-linktype value to
// the target item's path before it ever reaches the DOM input's value - unlike Internal Link,
// General Link's raw stored value (XML) is never what's actually in the input or the button.
const GENERAL_LINK_ITEM_ID = "c8d9e0f1-a2b3-4c4d-8e5f-a6b7c8d9e0f2";
const GENERAL_LINK_FIELD_LABEL = "Strategy General Link Internal";
const EXPECTED_FOBLES_BUTTON_TEXT = "/sitecore/system/Modules/Fobles Testing";

test.describe("Strategy scenario: general link", () => {
  test("toggling Fobles decorates and restores the general link field", async ({ page }, testInfo) => {
    const { fieldTable, lboltButton } = await activateFoblesForFieldStrategy(
      page,
      GENERAL_LINK_ITEM_ID,
      GENERAL_LINK_FIELD_LABEL,
    );
    const input = fieldTable.locator("input.scContentControl").first();
    const step = createStep(page, testInfo, getEditorSectionLocator(fieldTable), "General Link");

    await step("Default stage: field renders as a plain Sitecore input", async () => {
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

    await step(`Ctrl+click: opens the target item in a new tab: "${EXPECTED_FOBLES_BUTTON_TEXT}"`, async () => {
      const foblesButton = fieldTable.locator(FOBLES.SELECTORS.BUTTON).first();
      await expectFoblesButtonNewTabNavigation(page, testInfo, foblesButton, EXPECTED_FOBLES_BUTTON_TEXT);
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

    await step(`Click navigates to the target item: "${EXPECTED_FOBLES_BUTTON_TEXT}"`, async () => {
      const foblesButton = fieldTable.locator(FOBLES.SELECTORS.BUTTON).first();
      await expectFoblesButtonSameTabNavigation(page, testInfo, foblesButton, EXPECTED_FOBLES_BUTTON_TEXT);
    }, { screenshot: false });
  });
});
