import { expect, foblesTest } from "../../../fixtures/playwright";
import { TEST_CONST } from "../../../constants/TEST_CONST";
import { createFoblesStep } from "../../../helpers/fobles-helpers-support/test-step";
import {
  ClickFoblesGraphButton,
  CloseFoblesGraph,
  WaitForFoblesGraphEnrichmentComplete,
} from "../../../macros/fobles-macros";
import { setupReferenceGraphState } from "../harvest/harvest-test-helpers";

foblesTest.describe("Reference Graph", () => {
  foblesTest("opens, completes enrichment, and closes", async ({ page }, testInfo) => {
    foblesTest.setTimeout(TEST_CONST.TESTING.TIMEOUTS.TEST_SUITE_MS);

    await setupReferenceGraphState(page, { rawValues: false, standardFields: false });

    await ClickFoblesGraphButton(page);

    const graphDialog = page.locator(`#${TEST_CONST.FOBLES.DOM.IDS.DIALOG_ID}`);
    const step = createFoblesStep(page, testInfo, graphDialog, "Reference Graph");

    await step("Graph opens and completes enrichment", async () => {
      await expect(graphDialog).toBeVisible();
      await WaitForFoblesGraphEnrichmentComplete(page);
    });
    await step("Graph closes cleanly", async () => {
      await CloseFoblesGraph(page);
      await expect(graphDialog).toHaveCount(0);
    }, { screenshot: false });
  });
});
