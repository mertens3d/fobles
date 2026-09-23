import { expect, test } from "../fixtures/playwright";
import { openSitecorePage } from "../fixtures/sitecore";
import { CONST } from "../CONST";
import { createStep } from "../fobles-helpers";
import { resolveCornerPosition, showMouseMarker } from "../mouse-proxy";
import { dragToolbarTo } from "../sitecore-macros";
import { findFrameWithSelector } from "../frame-finder";

const STEP_WAIT_MS = CONST.SPEED.SETTINGS[CONST.SPEED.SELECTED].STEP_WAIT_MS;

// Content Editor's own default placement (DEFAULT_TOOLBAR_PLACEMENT, src/content/constants.ts)
// is "upper-right" - dragging toward the opposite corner (bottom-left) makes the snap
// unambiguous regardless of exact viewport size.
test.describe("Toolbar: drag to reposition", () => {
  test("dragging the toolbar container snaps it to the nearest corner", async ({ page }, testInfo) => {
    await openSitecorePage(page, CONST.SITECORE.PATHS.CONTENT_EDITOR);
    await showMouseMarker(page);

    const foblesFrame = await findFrameWithSelector(
      page,
      CONST.SITECORE.SELECTORS.TOOLBAR_CONTAINER,
      "Fobles toolbar",
    );
    await showMouseMarker(foblesFrame);

    const container = foblesFrame.locator(CONST.SITECORE.SELECTORS.TOOLBAR_CONTAINER).first();
    const grip = foblesFrame.locator(CONST.SITECORE.SELECTORS.TOOLBAR_GRIP).first();
    const step = createStep(page, testInfo, page, "Toolbar Drag");

    await step("Default stage: toolbar starts in its default corner", async () => {
      await expect(container).toBeVisible();
      await expect(container).toHaveAttribute("data-position", "upper-right");
      await page.waitForTimeout(STEP_WAIT_MS);
    });

    await step("Drag: toolbar snaps to the opposite corner", async () => {
      const viewport = page.viewportSize();
      if (!viewport) throw new Error("Could not read viewport size");

      await dragToolbarTo(page, grip, { x: 80, y: viewport.height - 80 });
      await expect(container).not.toHaveClass(/fobles-toolbar-dragging/);
      await expect(container).toHaveAttribute("data-position", "bottom-left");
      await page.waitForTimeout(STEP_WAIT_MS);
    });

    await step("Drag: toolbar snaps to the bottom-right corner", async () => {
      const viewport = page.viewportSize();
      if (!viewport) throw new Error("Could not read viewport size");

      await dragToolbarTo(page, grip, resolveCornerPosition(viewport, CONST.TOOLBAR_DRAG_POSITIONS.POSITION_2));
      await expect(container).not.toHaveClass(/fobles-toolbar-dragging/);
      await expect(container).toHaveAttribute("data-position", "bottom-right");
      await page.waitForTimeout(STEP_WAIT_MS);

      await dragToolbarTo(page, grip, resolveCornerPosition(viewport, CONST.TOOLBAR_DRAG_POSITIONS.POSITION_3));
      await expect(container).not.toHaveClass(/fobles-toolbar-dragging/);
      await expect(container).toHaveAttribute("data-position", "bottom-right");
      await page.waitForTimeout(STEP_WAIT_MS);
    });

    await step("Drag back: toolbar returns to its default corner", async () => {
      const viewport = page.viewportSize();
      if (!viewport) throw new Error("Could not read viewport size");

      await dragToolbarTo(page, grip, resolveCornerPosition(viewport, CONST.TOOLBAR_DRAG_POSITIONS.DEFAULT));
      await expect(container).toHaveAttribute("data-position", "upper-right");
    });
  });
});
