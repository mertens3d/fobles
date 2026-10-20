// @source-path [fobles] tests/e2e/reference-graph/reference-graph-error-dialog.spec.ts

import { expect, foblesTest } from "../../fixtures/playwright";
import { findFoblesFrame } from "../../helpers/frame-finder";
import { ClickFoblesGraphButton } from "../../macros/fobles-macros";
import { setupReferenceGraphState } from "./reference-graph-test-helpers";
import { TEST_CONST } from "../../constants/TEST_CONST";

const RUNTIME_TESTING_STORAGE_KEY = "fobles-runtime-testing";
const ERROR_DIALOG_SELECTOR = "#fobles-error-dialog";
const EXPECTED_ERROR =
  "Something has gone wrong. Sitecore may no longer be in its original Raw Values / Standard Fields state.";

foblesTest.describe("Reference Graph error handling", () => {
  foblesTest("shows a user-visible error when editor-state restoration fails", async ({ page }) => {
    foblesTest.setTimeout(TEST_CONST.TESTING.TIMEOUTS.TEST_SUITE_MS);

    await setupReferenceGraphState(page, {
      rawValues: false,
      standardFields: true,
    });

    const foblesFrame = await findFoblesFrame(page);

    try {
      await foblesFrame.evaluate(
        ({ storageKey }) => {
          localStorage.setItem(
            storageKey,
            JSON.stringify({
              enabled: true,
              faults: {
                referenceGraph: {
                  failRestoreEditorState: true,
                },
              },
            }),
          );
        },
        { storageKey: RUNTIME_TESTING_STORAGE_KEY },
      );

      await ClickFoblesGraphButton(page);

      const errorDialog = foblesFrame.locator(ERROR_DIALOG_SELECTOR);

      await expect(errorDialog).toBeVisible();
      await expect(errorDialog).toContainText("Reference Graph");
      await expect(errorDialog).toContainText(EXPECTED_ERROR);
      await expect(
        foblesFrame.locator(`#${TEST_CONST.FOBLES.DOM.IDS.PROGRESS_DIALOG_ID}`),
      ).toHaveCount(0);
      await expect(
        foblesFrame.locator(`#${TEST_CONST.FOBLES.DOM.IDS.DIALOG_ID}`),
      ).toHaveCount(0);
    } finally {
      await foblesFrame.evaluate(
        ({ storageKey }) => {
          localStorage.removeItem(storageKey);
        },
        { storageKey: RUNTIME_TESTING_STORAGE_KEY },
      );
    }
  });
});