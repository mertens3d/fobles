import { expect, test } from "../fixtures/playwright";
import { CONST } from "../CONST";
import {
  activateFoblesForFieldStrategy,
  createStep,
  getEditorSectionLocator,
} from "../fobles-helpers";
import { clickLboltButton } from "../sitecore-macros";
import {
  FOBLES,
  FOBLES_HIDDEN_CLASS_PATTERN,
  fieldScreenshotName,
} from "./CONST";
import { runClickNavigationSteps } from "./click-navigation-steps";
import { STRATEGY_SCENARIOS } from "./strategy-scenarios";

const STEP_WAIT_MS = CONST.SPEED.SETTINGS[CONST.SPEED.SELECTED].STEP_WAIT_MS;
const SCENARIO = STRATEGY_SCENARIOS.DROP_LINK;
const SCREENSHOT_BASE_NAME = "droplink-1x";

test.describe("Strategy scenario: droplink", () => {
  test("toggling Fobles decorates and restores the droplink field", async ({ page }, testInfo) => {
    const { fieldTable, lboltButton } = await activateFoblesForFieldStrategy(
      page,
      SCENARIO.itemId,
      SCENARIO.fieldLabel,
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
      await expect(foblesButton).toHaveText(SCENARIO.expectedButtonText);
      await expect(fieldTable).toHaveScreenshot(fieldScreenshotName(SCREENSHOT_BASE_NAME, "FOBLES_ON"));
      await page.waitForTimeout(STEP_WAIT_MS);
    });

    await runClickNavigationSteps(step, page, testInfo, fieldTable, lboltButton, select, SCENARIO, async () => {
      await expect(fieldTable).toHaveScreenshot(fieldScreenshotName(SCREENSHOT_BASE_NAME, "DEFAULT"));
    });
  });
});

