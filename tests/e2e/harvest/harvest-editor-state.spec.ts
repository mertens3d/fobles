import { expect, foblesTest } from "../../fixtures/playwright";
import {
  reloadAndReadEditorState,
  setupReferenceGraphState,
  type EditorState,
} from "./harvest-test-helpers";
import { TEST_CONST } from "../../constants/TEST_CONST";
import {
  ClickFoblesGraphButton,
  CloseFoblesGraph,
  WaitForFoblesGraphEnrichmentComplete,
} from "../../macros/fobles-macros";

const STATES: readonly { label: string; initial: EditorState }[] = [
  { label: "Raw OFF / Standard OFF", initial: { rawValues: false, standardFields: false } },
  { label: "Raw ON / Standard OFF", initial: { rawValues: true, standardFields: false } },
  { label: "Raw OFF / Standard ON", initial: { rawValues: false, standardFields: true } },
  { label: "Raw ON / Standard ON", initial: { rawValues: true, standardFields: true } },
];

foblesTest.describe("Harvest editor state", () => {
  for (const { label, initial } of STATES) {
    foblesTest(`${label}: restores caller editor state`, async ({ page }) => {
      foblesTest.setTimeout(TEST_CONST.TESTING.TIMEOUTS.TEST_SUITE_MS);

      await setupReferenceGraphState(page, initial);
      await ClickFoblesGraphButton(page);
      await WaitForFoblesGraphEnrichmentComplete(page);
      await CloseFoblesGraph(page);

      const restored = await reloadAndReadEditorState(page);
      expect(restored).toEqual(initial);
    });
  }
});