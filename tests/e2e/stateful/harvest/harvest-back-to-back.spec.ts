import { expect, foblesTest, type Page, type TestInfo } from "../../../fixtures/playwright";
import { createFoblesStep } from "../../../helpers/fobles-helpers-support/test-step";
import { TEST_CONST } from "../../../constants/TEST_CONST";
import {
  ClickFoblesGraphButton,
  CloseFoblesGraph,
  WaitForFoblesGraphEnrichmentComplete,
} from "../../../macros/fobles-macros";
import { reloadAndReadEditorState, setupReferenceGraphState } from "./harvest-test-helpers";
import { type EditorState } from "./EditorState";

const FIRST_STATE: EditorState = { rawValues: false, standardFields: true };

const SECOND_STATE: EditorState = { rawValues: true, standardFields: false };

async function completeHarvest(
  page: Page,
  testInfo: TestInfo,
  label: string,
): Promise<void> {
  await ClickFoblesGraphButton(page);
  const graphDialog = page.locator(`#${TEST_CONST.FOBLES.DOM.IDS.DIALOG_ID}`);
  const step = createFoblesStep(page, testInfo, graphDialog, label);
  await step("Harvest completes in the Reference Graph", async () => {
    await WaitForFoblesGraphEnrichmentComplete(page);
    await expect(graphDialog).toBeVisible();
  });
  await step("Graph closes before checking restored editor state", async () => {
    await CloseFoblesGraph(page);
    await expect(graphDialog).toHaveCount(0);
  }, { screenshot: false });
}

foblesTest.describe("Harvest session isolation", () => {
  foblesTest("back-to-back harvests restore their own caller editor states", async ({ page }, testInfo) => {
    foblesTest.setTimeout(TEST_CONST.TESTING.TIMEOUTS.TEST_SUITE_MS);

    await setupReferenceGraphState(page, FIRST_STATE);
    await completeHarvest(page, testInfo, "First Harvest");

    const firstRestored = await reloadAndReadEditorState(page);
    expect(firstRestored).toEqual(FIRST_STATE);

    await setupReferenceGraphState(page, SECOND_STATE);
    await completeHarvest(page, testInfo, "Second Harvest");

    const secondRestored = await reloadAndReadEditorState(page);
    expect(secondRestored).toEqual(SECOND_STATE);
  });
});
