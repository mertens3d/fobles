import { expect, foblesTest } from "../../../fixtures/playwright";
import { createFoblesStep } from "../../../helpers/fobles-helpers-support/test-step";
import { reloadAndReadEditorState, setupReferenceGraphState } from "./harvest-test-helpers";
import { type EditorState } from "./EditorState.types";
import { TEST_CONST } from "../../../constants/TEST_CONST";
import {
  ClickFoblesGraphButton,
  CloseFoblesGraph,
  WaitForFoblesGraphEnrichmentComplete,
} from "../../../macros/fobles-macros";

const STATES: readonly { label: string; initial: EditorState }[] = [
  { label: "Raw OFF / Standard OFF", initial: { rawValues: false, standardFields: false } },
  { label: "Raw ON / Standard OFF", initial: { rawValues: true, standardFields: false } },
  { label: "Raw OFF / Standard ON", initial: { rawValues: false, standardFields: true } },
  { label: "Raw ON / Standard ON", initial: { rawValues: true, standardFields: true } },
];

foblesTest.describe("Harvest editor state", () => {
  for (const { label, initial } of STATES) {
    foblesTest(`${label}: restores caller editor state`, async ({ page }, testInfo) => {
      foblesTest.setTimeout(TEST_CONST.TESTING.TIMEOUTS.TEST_SUITE_MS);

      await setupReferenceGraphState(page, initial);
      await ClickFoblesGraphButton(page);
      const graphDialog = page.locator(`#${TEST_CONST.FOBLES.DOM.IDS.DIALOG_ID}`);
      const step = createFoblesStep(page, testInfo, graphDialog, "Harvest Editor State");
      await step("Harvest completes in the Reference Graph", async () => {
        await WaitForFoblesGraphEnrichmentComplete(page);
        await expect(graphDialog).toBeVisible();
      });
      await step("Graph closes before checking restored editor state", async () => {
        await CloseFoblesGraph(page);
        await expect(graphDialog).toHaveCount(0);
      }, { screenshot: false });

      const restored = await reloadAndReadEditorState(page);
      expect(restored).toEqual(initial);
    });
  }
});
