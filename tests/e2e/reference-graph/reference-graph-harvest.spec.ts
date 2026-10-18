import { expect, foblesTest } from "../../fixtures/playwright";
import { clickWithMouseMarker } from "../../helpers/mouse-proxy";
import { findFoblesFrame } from "../../helpers/frame-finder";
import {
  reloadAndReadEditorState,
  setupReferenceGraphState,
  type EditorState,
} from "./reference-graph-test-helpers";
import { TEST_CONST } from "../../TEST_CONST";

const STATES: readonly { label: string; initial: EditorState }[] = [
  { label: "Raw OFF / Standard OFF", initial: { rawValues: false, standardFields: false } },
  { label: "Raw ON / Standard OFF", initial: { rawValues: true, standardFields: false } },
  { label: "Raw OFF / Standard ON", initial: { rawValues: false, standardFields: true } },
  { label: "Raw ON / Standard ON", initial: { rawValues: true, standardFields: true } },
];

foblesTest.describe("Reference Graph harvest state", () => {
  for (const { label, initial } of STATES) {
    foblesTest(`${label}: restores Content Editor state`, async ({ page }) => {
      foblesTest.setTimeout(TEST_CONST.TESTING.TIMEOUTS.TEST_SUITE_MS);

      await setupReferenceGraphState(page, initial);

      const foblesFrame = await findFoblesFrame(page);
      const referenceGraphButton = foblesFrame.getByRole("button", { name: /reference graph/i });

      await expect(referenceGraphButton).toBeVisible();
      await clickWithMouseMarker(page, referenceGraphButton, "Reference Graph");

      const graphDialog = page.locator(`#${TEST_CONST.FOBLES.DOM.IDS.DIALOG_ID}`);

      await expect(graphDialog).toBeVisible({
        timeout: TEST_CONST.TESTING.TIMEOUTS.TEST_SUITE_MS,
      });

      const restored = await reloadAndReadEditorState(page);
      expect(restored).toEqual(initial);
    });
  }
});