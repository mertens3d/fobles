// @source-path [fobles] tests/e2e/stateful/graph/reference-graph-field-crops.spec.ts

import { expect, foblesTest } from "../../../fixtures/playwright";
import { TEST_CONST } from "../../../constants/TEST_CONST";
import { createFoblesStep } from "../../../helpers/fobles-helpers-support/test-step";
import {
  ClickFoblesGraphButton,
  CloseFoblesGraph,
  ExpandFoblesGraphControls,
  SetFoblesGraphFilter,
  WaitForFoblesGraphEnrichmentComplete,
} from "../../../macros/fobles-macros";
import { reloadAndReadEditorState, setupReferenceGraphState } from "../harvest/harvest-test-helpers";
import { type EditorState } from "../harvest/EditorState.types";

const FILTER_RERENDER_TIMEOUT_MS = 30_000;

foblesTest.describe("Reference Graph: Custom Fields / Standard Fields crops", () => {
  foblesTest("Custom Fields and Standard Fields are independent filters", async ({ page }, testInfo) => {
    foblesTest.setTimeout(TEST_CONST.TESTING.TIMEOUTS.TEST_SUITE_MS);

    await setupReferenceGraphState(page, { rawValues: false, standardFields: false });
    await ClickFoblesGraphButton(page);
    await WaitForFoblesGraphEnrichmentComplete(page);
    await ExpandFoblesGraphControls(page);
    const graphDialog = page.locator(`#${TEST_CONST.FOBLES.DOM.IDS.DIALOG_ID}`);
    const step = createFoblesStep(page, testInfo, graphDialog, "Reference Graph Filters");

    await step("Custom and Standard Fields remain independent", async () => {
      await SetFoblesGraphFilter(page, "Custom Fields", true);
      await SetFoblesGraphFilter(page, "Standard Fields", true);
      await SetFoblesGraphFilter(page, "Custom Fields", false);

      const standardFieldsCheckbox = graphDialog.locator(".fobles-filter-list").getByLabel("Standard Fields", { exact: true });

      await expect(standardFieldsCheckbox).toBeChecked();
    });

    await step("Close the graph after checking independent filters", async () => await CloseFoblesGraph(page), {
      screenshot: false,
    });
  });

  foblesTest(
    "enabling Standard Fields after the graph is drawn toggles Sitecore only when needed, then restores state",
    async ({ page }, testInfo) => {
      foblesTest.setTimeout(TEST_CONST.TESTING.TIMEOUTS.TEST_SUITE_MS);

      const initial: EditorState = { rawValues: false, standardFields: false };

      await setupReferenceGraphState(page, initial);
      await ClickFoblesGraphButton(page);
      await WaitForFoblesGraphEnrichmentComplete(page);
      await ExpandFoblesGraphControls(page);
      const graphDialog = page.locator(`#${TEST_CONST.FOBLES.DOM.IDS.DIALOG_ID}`);
      const step = createFoblesStep(page, testInfo, graphDialog, "Reference Graph Filters");

      await step("Enable Standard Fields and wait for graph rendering", async () => {
        await SetFoblesGraphFilter(page, "Standard Fields", true);

        const blocker = graphDialog.locator(".fobles-reference-graph-canvas-blocker");
        await expect(blocker, "Graph should finish rendering after enabling Standard Fields").toHaveCount(0, {
          timeout: FILTER_RERENDER_TIMEOUT_MS,
        });
      });

      await CloseFoblesGraph(page);

      const restored = await reloadAndReadEditorState(page);
      expect(restored).toEqual(initial);
    },
  );

  foblesTest(
    "Standard Fields already enabled in Sitecore: enabling the Fobles filter does not re-toggle it",
    async ({ page }, testInfo) => {
      foblesTest.setTimeout(TEST_CONST.TESTING.TIMEOUTS.TEST_SUITE_MS);

      const initial: EditorState = { rawValues: false, standardFields: true };

      await setupReferenceGraphState(page, initial);
      await ClickFoblesGraphButton(page);
      await WaitForFoblesGraphEnrichmentComplete(page);
      await ExpandFoblesGraphControls(page);
      const graphDialog = page.locator(`#${TEST_CONST.FOBLES.DOM.IDS.DIALOG_ID}`);
      const step = createFoblesStep(page, testInfo, graphDialog, "Reference Graph Filters");

      await step("Enable Standard Fields without re-toggling Sitecore state", async () => {
        await SetFoblesGraphFilter(page, "Standard Fields", true);

        const blocker = graphDialog.locator(".fobles-reference-graph-canvas-blocker");
        await expect(blocker, "Graph should finish rendering when Standard Fields are already enabled").toHaveCount(0, {
          timeout: FILTER_RERENDER_TIMEOUT_MS,
        });
      });

      await CloseFoblesGraph(page);

      const restored = await reloadAndReadEditorState(page);
      expect(restored).toEqual(initial);
    },
  );
});
