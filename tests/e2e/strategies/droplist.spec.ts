import { expect, test } from "../fixtures/playwright";
import { CONST } from "../CONST";
import {
  activateFoblesForFieldStrategy,
  createStep,
  getEditorSectionLocator,
} from "../fobles-helpers";
import { clickLboltButton } from "../sitecore-macros";
import { FOBLES } from "./CONST";
import { STRATEGY_SCENARIOS } from "./strategy-scenarios";

const STEP_WAIT_MS = CONST.SPEED.SETTINGS[CONST.SPEED.SELECTED].STEP_WAIT_MS;

// Droplist renders the same select.scContentControl.scCombobox markup as Droplink, but Sitecore
// stores/renders only the chosen value's plain name text for it, never an item GUID - there's no
// navigation target Fobles could ever expose, so sc-droplist.ts leaves genuine Droplist fields
// completely untouched (no hidden class, no wrapper, no button). This test only asserts that
// no-op, unlike every other strategy spec.
const SCENARIO = STRATEGY_SCENARIOS.DROPLIST;

test.describe("Strategy scenario: droplist", () => {
  test("Fobles leaves the droplist field untouched", async ({ page }, testInfo) => {
    const { fieldTable, lboltButton } = await activateFoblesForFieldStrategy(
      page,
      SCENARIO.itemId,
      SCENARIO.fieldLabel,
    );
    const select = fieldTable.locator("select.scContentControl.scCombobox").first();
    const step = createStep(page, testInfo, getEditorSectionLocator(fieldTable), "Droplist");

    await step("Default stage: field renders as a plain Sitecore select", async () => {
      await expect(select).toBeVisible();
      await expect(fieldTable.locator(FOBLES.SELECTORS.WRAPPER)).toHaveCount(0);
      await page.waitForTimeout(STEP_WAIT_MS);
    });

    await step("Toggle Fobles on: the field has no navigable value, so nothing changes", async () => {
      await clickLboltButton(page, lboltButton);
      await expect(select).toBeVisible();
      await expect(fieldTable.locator(FOBLES.SELECTORS.WRAPPER)).toHaveCount(0);
      await expect(fieldTable.locator(FOBLES.SELECTORS.BUTTON)).toHaveCount(0);
      await page.waitForTimeout(STEP_WAIT_MS);
    });
  });
});
