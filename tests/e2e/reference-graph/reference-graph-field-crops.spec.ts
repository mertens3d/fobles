// @source-path [fobles] tests/e2e/reference-graph/reference-graph-field-crops.spec.ts

import { expect, foblesTest } from "../../fixtures/playwright";
import { TEST_CONST } from "../../constants/TEST_CONST";
import {
  ClickFoblesGraphButton,
  CloseFoblesGraph,
  ExpandFoblesGraphControls,
  SetFoblesGraphFilter,
  WaitForFoblesGraphEnrichmentComplete,
} from "../../macros/fobles-macros";
import {
  reloadAndReadEditorState,
  setupReferenceGraphState,
  type EditorState,
} from "../harvest/harvest-test-helpers";

foblesTest.describe("Reference Graph: Custom Fields / Standard Fields crops", () => {
  foblesTest("Custom Fields and Standard Fields are independent filters", async ({ page }) => {
    foblesTest.setTimeout(TEST_CONST.TESTING.TIMEOUTS.TEST_SUITE_MS);

    await setupReferenceGraphState(page, { rawValues: false, standardFields: false });
    await ClickFoblesGraphButton(page);
    await WaitForFoblesGraphEnrichmentComplete(page);
    await ExpandFoblesGraphControls(page);

    await SetFoblesGraphFilter(page, "Custom Fields", true);
    await SetFoblesGraphFilter(page, "Standard Fields", true);
    await SetFoblesGraphFilter(page, "Custom Fields", false);

    const standardFieldsCheckbox = page
      .locator(`#${TEST_CONST.FOBLES.DOM.IDS.DIALOG_ID}`)
      .locator(".fobles-reference-graph-filter", { hasText: "Standard Fields" })
      .locator("input[type='checkbox']");

    await expect(standardFieldsCheckbox).toBeChecked();

    await CloseFoblesGraph(page);
  });

  foblesTest("enabling Standard Fields after the graph is drawn toggles Sitecore only when needed, then restores state", async ({ page }) => {
    foblesTest.setTimeout(TEST_CONST.TESTING.TIMEOUTS.TEST_SUITE_MS);

    const initial: EditorState = { rawValues: false, standardFields: false };

    await setupReferenceGraphState(page, initial);
    await ClickFoblesGraphButton(page);
    await WaitForFoblesGraphEnrichmentComplete(page);
    await ExpandFoblesGraphControls(page);

    await SetFoblesGraphFilter(page, "Standard Fields", true);

    const blocker = page.locator(
      `#${TEST_CONST.FOBLES.DOM.IDS.DIALOG_ID} .fobles-reference-graph-canvas-blocker`,
    );
    await expect(blocker).toHaveCount(0, { timeout: TEST_CONST.TESTING.TIMEOUTS.TEST_SUITE_MS });

    await CloseFoblesGraph(page);

    const restored = await reloadAndReadEditorState(page);
    expect(restored).toEqual(initial);
  });

  foblesTest("Standard Fields already enabled in Sitecore: enabling the Fobles filter does not re-toggle it", async ({ page }) => {
    foblesTest.setTimeout(TEST_CONST.TESTING.TIMEOUTS.TEST_SUITE_MS);

    const initial: EditorState = { rawValues: false, standardFields: true };

    await setupReferenceGraphState(page, initial);
    await ClickFoblesGraphButton(page);
    await WaitForFoblesGraphEnrichmentComplete(page);
    await ExpandFoblesGraphControls(page);

    await SetFoblesGraphFilter(page, "Standard Fields", true);

    const blocker = page.locator(
      `#${TEST_CONST.FOBLES.DOM.IDS.DIALOG_ID} .fobles-reference-graph-canvas-blocker`,
    );
    await expect(blocker).toHaveCount(0, { timeout: TEST_CONST.TESTING.TIMEOUTS.TEST_SUITE_MS });

    await CloseFoblesGraph(page);

    const restored = await reloadAndReadEditorState(page);
    expect(restored).toEqual(initial);
  });
});
