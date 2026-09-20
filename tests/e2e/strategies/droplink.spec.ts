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
import {
  FOBLES,
  FOBLES_HIDDEN_CLASS_PATTERN,
  fieldScreenshotName,
} from "./CONST";

const STEP_WAIT_MS = CONST.SPEED.SETTINGS[CONST.SPEED.SELECTED].STEP_WAIT_MS;

// "Strategy droplink" test content item (tests/items-folbles) - Strategy DropLink 1x field,
// the simplest droplink case (exactly one candidate item, one selected).
const DROPLINK_ITEM_ID = "25FB9977-CC90-4E3C-B036-CAFAAE676303";
const DROPLINK_FIELD_LABEL = "Strategy DropLink 1x";
const EXPECTED_FOBLES_BUTTON_TEXT = "Fobles Data Item A";
// The selected item's own ID (tests/items-folbles/.../Field Data/List 1x/Fobles Data Item A) -
// what the Fobles button should navigate to.
const SELECTED_ITEM_ID = "{2CAAAD6C-31B1-4672-9576-C408177DC2DB}";
const SCREENSHOT_BASE_NAME = "droplink-1x";

test.describe("Strategy scenario: droplink", () => {
  test("toggling Fobles decorates and restores the droplink field", async ({ page }, testInfo) => {
    const { fieldTable, lboltButton } = await activateFoblesForFieldStrategy(
      page,
      DROPLINK_ITEM_ID,
      DROPLINK_FIELD_LABEL,
    );
    const select = fieldTable.locator("select.scContentControl.scCombobox").first();
    const step = createStep(page, testInfo, getEditorSectionLocator(fieldTable), "Droplink");

    await step("Default stage: field renders as a plain Sitecore select", async () => {
      await expect(select).toBeVisible();
      await expect(fieldTable.locator(FOBLES.SELECTORS.WRAPPER)).toHaveCount(0);
      await expect(fieldTable).toHaveScreenshot(fieldScreenshotName(SCREENSHOT_BASE_NAME, "DEFAULT"));
      await page.waitForTimeout(STEP_WAIT_MS);
    });

    await step("Toggle Fobles on: the field gets a Fobles button", async () => {
      await clickLboltButton(page, lboltButton);
      await expect(select).toHaveClass(FOBLES_HIDDEN_CLASS_PATTERN);
      const foblesButton = fieldTable.locator(FOBLES.SELECTORS.BUTTON).first();
      await expect(foblesButton).toBeVisible();
      await expect(foblesButton).toHaveText(EXPECTED_FOBLES_BUTTON_TEXT);
      await expect(fieldTable).toHaveScreenshot(fieldScreenshotName(SCREENSHOT_BASE_NAME, "FOBLES_ON"));
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
      await expect(fieldTable).toHaveScreenshot(fieldScreenshotName(SCREENSHOT_BASE_NAME, "DEFAULT"));
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

