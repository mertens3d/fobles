import { expect, foblesTest } from "../../fixtures/playwright";
import { TEST_CONST } from "../../constants/TEST_CONST";
import {
  ClickFoblesGraphButton,
  CloseFoblesGraph,
  ToggleFoblesWindowCollapse,
  ToggleFoblesWindowMaximize,
} from "../../macros/fobles-macros";
import { setupReferenceGraphState } from "../harvest/harvest-test-helpers";
import { expectBoxClose, getRequiredBoundingBox } from "../../helpers/shared-window-geometry-helpers";

const COLLAPSED_HEIGHT_CEILING_PX = 60;
const DOCK_BOTTOM_TOLERANCE_PX = 40;
const MAXIMIZE_MARGIN_TOLERANCE_PX = 20;

// Regression coverage for the shared FoblesWindow minimize/maximize lifecycle: minimizing docks
// the window to the bottom of the viewport, maximizing fills it, and restoring from either
// returns the window to its exact pre-toggle rect (the "restoreRect" persistence behavior).
foblesTest.describe("Shared specialist window collapse and maximize lifecycle", { tag: "@sitecore-state" }, () => {
  foblesTest(
    "minimizing docks the window to the bottom of the viewport, and restoring returns its previous rect",
    async ({ page }) => {
      foblesTest.setTimeout(TEST_CONST.TESTING.TIMEOUTS.TEST_SUITE_MS);

      await setupReferenceGraphState(page, { rawValues: false, standardFields: false });
      await ClickFoblesGraphButton(page);

      const dialog = page.locator(`#${TEST_CONST.FOBLES.DOM.IDS.DIALOG_ID}`);
      await expect(dialog).toBeVisible();
      const viewport = page.viewportSize();
      if (!viewport) {
        throw new Error("Expected the page to have a viewport size.");
      }
      const beforeCollapse = await getRequiredBoundingBox(dialog, "the graph window before collapse");

      await ToggleFoblesWindowCollapse(page, dialog);
      await expect(dialog).toHaveClass(/is-collapsed/);
      const collapsed = await getRequiredBoundingBox(dialog, "the graph window while collapsed");

      expect(collapsed.height).toBeLessThan(COLLAPSED_HEIGHT_CEILING_PX);
      expect(collapsed.y + collapsed.height).toBeGreaterThan(viewport.height - DOCK_BOTTOM_TOLERANCE_PX);
      expectBoxClose(collapsed, beforeCollapse, ["x", "width"]);

      await ToggleFoblesWindowCollapse(page, dialog);
      await expect(dialog).not.toHaveClass(/is-collapsed/);
      const restored = await getRequiredBoundingBox(dialog, "the graph window after restoring from collapse");
      expectBoxClose(restored, beforeCollapse);

      await CloseFoblesGraph(page);
    },
  );

  foblesTest("maximizing fills the viewport, and restoring returns its previous rect", async ({ page }) => {
    foblesTest.setTimeout(TEST_CONST.TESTING.TIMEOUTS.TEST_SUITE_MS);

    await setupReferenceGraphState(page, { rawValues: false, standardFields: false });
    await ClickFoblesGraphButton(page);

    const dialog = page.locator(`#${TEST_CONST.FOBLES.DOM.IDS.DIALOG_ID}`);
    await expect(dialog).toBeVisible();
    const viewport = page.viewportSize();
    if (!viewport) {
      throw new Error("Expected the page to have a viewport size.");
    }
    const beforeMaximize = await getRequiredBoundingBox(dialog, "the graph window before maximize");

    await ToggleFoblesWindowMaximize(page, dialog);
    await expect(dialog).toHaveClass(/is-maximized/);
    const maximized = await getRequiredBoundingBox(dialog, "the graph window while maximized");

    expect(maximized.x).toBeLessThan(MAXIMIZE_MARGIN_TOLERANCE_PX);
    expect(maximized.y).toBeLessThan(MAXIMIZE_MARGIN_TOLERANCE_PX);
    expect(maximized.width).toBeGreaterThan(viewport.width - MAXIMIZE_MARGIN_TOLERANCE_PX * 2);
    expect(maximized.height).toBeGreaterThan(viewport.height - MAXIMIZE_MARGIN_TOLERANCE_PX * 2);

    await ToggleFoblesWindowMaximize(page, dialog);
    await expect(dialog).not.toHaveClass(/is-maximized/);
    const restored = await getRequiredBoundingBox(dialog, "the graph window after restoring from maximize");
    expectBoxClose(restored, beforeMaximize);

    await CloseFoblesGraph(page);
  });
});
