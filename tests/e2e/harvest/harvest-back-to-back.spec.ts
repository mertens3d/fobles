import { expect, foblesTest } from "../../fixtures/playwright";
import { TEST_CONST } from "../../constants/TEST_CONST";
import {
  ClickFoblesGraphButton,
  CloseFoblesGraph,
  WaitForFoblesGraphEnrichmentComplete,
} from "../../macros/fobles-macros";
import {
  reloadAndReadEditorState,
  setupReferenceGraphState,
  type EditorState,
} from "./harvest-test-helpers";

const FIRST_STATE: EditorState = {
  rawValues: false,
  standardFields: true,
};

const SECOND_STATE: EditorState = {
  rawValues: true,
  standardFields: false,
};

async function completeHarvest(page: Parameters<typeof ClickFoblesGraphButton>[0]): Promise<void> {
  await ClickFoblesGraphButton(page);
  await WaitForFoblesGraphEnrichmentComplete(page);
  await CloseFoblesGraph(page);
}

foblesTest.describe("Harvest session isolation", () => {
  foblesTest(
    "back-to-back harvests restore their own caller editor states",
    async ({ page }) => {
      foblesTest.setTimeout(TEST_CONST.TESTING.TIMEOUTS.TEST_SUITE_MS);

      await setupReferenceGraphState(page, FIRST_STATE);
      await completeHarvest(page);

      const firstRestored = await reloadAndReadEditorState(page);
      expect(firstRestored).toEqual(FIRST_STATE);

      await setupReferenceGraphState(page, SECOND_STATE);
      await completeHarvest(page);

      const secondRestored = await reloadAndReadEditorState(page);
      expect(secondRestored).toEqual(SECOND_STATE);
    },
  );
});