import { expect, foblesTest, type Locator, type Page } from "../../../fixtures/playwright";
import { TEST_CONST } from "../../../constants/TEST_CONST";
import { ClickFoblesGraphButton, CloseFoblesGraph } from "../../../macros/fobles-macros";
import { setupReferenceGraphState } from "../harvest/harvest-test-helpers";
import { expectBoxClose, getRequiredBoundingBox } from "../../../helpers/shared-window-geometry-helpers";
import { FOBLES_WINDOW_TITLE_BAR_HEIGHT, FOBLES_WINDOW_VIEWPORT_MARGIN } from "../../../../src/content/shared/dialog/fobles-window.const";

async function dragWindow(page: Page, titleBar: Locator, dx: number, dy: number): Promise<void> {
  const titleBox = await getRequiredBoundingBox(titleBar, "the title bar");
  const startX = titleBox.x + titleBox.width / 2;
  const startY = titleBox.y + titleBox.height / 2;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + dx, startY + dy, { steps: 5 });
  await page.mouse.up();
}

// Regression coverage for the shared FoblesWindow title-bar drag and corner resize, and the
// historical defect where resize continued moving the window after the mouse button was released.
foblesTest.describe("Shared specialist window drag and resize", () => {
  foblesTest("title bar drag moves the window without resizing it, and stops on release", async ({ page }) => {
    foblesTest.setTimeout(TEST_CONST.TESTING.TIMEOUTS.TEST_SUITE_MS);

    await setupReferenceGraphState(page, { rawValues: false, standardFields: false });
    await ClickFoblesGraphButton(page);

    const dialog = page.locator(`#${TEST_CONST.FOBLES.DOM.IDS.DIALOG_ID}`);
    const titleBar = dialog.locator(".fobles-window-titlebar");
    await expect(dialog).toBeVisible();

    const before = await getRequiredBoundingBox(dialog, "the graph window");
    const viewport = await page.evaluate(() => ({ height: window.innerHeight, width: window.innerWidth }));
    const horizontalLimit = viewport.width - FOBLES_WINDOW_VIEWPORT_MARGIN - before.width;
    const verticalLimit = viewport.height - FOBLES_WINDOW_TITLE_BAR_HEIGHT - FOBLES_WINDOW_VIEWPORT_MARGIN;
    const room = {
      down: verticalLimit - before.y,
      left: before.x - FOBLES_WINDOW_VIEWPORT_MARGIN,
      right: horizontalLimit - before.x,
      up: before.y - FOBLES_WINDOW_VIEWPORT_MARGIN,
    };
    const deltaX = room.left >= room.right ? -Math.min(80, room.left) : Math.min(80, room.right);
    const deltaY = room.up >= room.down ? -Math.min(40, room.up) : Math.min(40, room.down);
    expect(Math.abs(deltaX) + Math.abs(deltaY)).toBeGreaterThan(0);

    await dragWindow(page, titleBar, deltaX, deltaY);
    const titleBox = await getRequiredBoundingBox(titleBar, "the title bar");
    const startX = titleBox.x + titleBox.width / 2 - deltaX;
    const startY = titleBox.y + titleBox.height / 2 - deltaY;

    const midDrag = await getRequiredBoundingBox(dialog, "the graph window mid-drag");
    expectBoxClose(midDrag, { x: before.x + deltaX, y: before.y + deltaY, width: before.width, height: before.height });

    const afterRelease = await getRequiredBoundingBox(dialog, "the graph window after release");

    // Regression: pointer movement after release must not continue moving the window.
    await page.mouse.move(startX + deltaX + 200, startY + deltaY + 200, { steps: 5 });
    const afterStrayMove = await getRequiredBoundingBox(dialog, "the graph window after a stray post-release move");
    expectBoxClose(afterStrayMove, afterRelease, ["x", "y"]);

    await CloseFoblesGraph(page);
  });

  foblesTest("southeast corner resize grows the window and stops on release", async ({ page }) => {
    foblesTest.setTimeout(TEST_CONST.TESTING.TIMEOUTS.TEST_SUITE_MS);

    await setupReferenceGraphState(page, { rawValues: false, standardFields: false });
    await ClickFoblesGraphButton(page);

    const dialog = page.locator(`#${TEST_CONST.FOBLES.DOM.IDS.DIALOG_ID}`);
    const resizeHandle = dialog.locator(".fobles-window-resize--se");
    await expect(dialog).toBeVisible();

    const before = await getRequiredBoundingBox(dialog, "the graph window");
    const viewport = await page.evaluate(() => ({ height: window.innerHeight, width: window.innerWidth }));
    const roomLeft = before.x - FOBLES_WINDOW_VIEWPORT_MARGIN;
    if (roomLeft > 0) {
      await dragWindow(page, dialog.locator(".fobles-window-titlebar"), -roomLeft, 0);
    }
    const positioned = await getRequiredBoundingBox(dialog, "the graph window at the left viewport margin");
    const availableWidth = Math.max(0, viewport.width - FOBLES_WINDOW_VIEWPORT_MARGIN - positioned.x - positioned.width);
    const availableHeight = Math.max(0, viewport.height - FOBLES_WINDOW_VIEWPORT_MARGIN - positioned.y - positioned.height);
    const deltaX = Math.min(60, availableWidth);
    const deltaY = Math.min(60, availableHeight);
    expect(deltaX + deltaY).toBeGreaterThan(0);
    const handleBox = await getRequiredBoundingBox(resizeHandle, "the southeast resize handle");
    const startX = handleBox.x + handleBox.width / 2;
    const startY = handleBox.y + handleBox.height / 2;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + deltaX, startY + deltaY, { steps: 5 });

    const midResize = await getRequiredBoundingBox(dialog, "the graph window mid-resize");
    // Resizing from the southeast corner must not relocate the window.
    expectBoxClose(midResize, {
      x: positioned.x,
      y: positioned.y,
      width: positioned.width + deltaX,
      height: positioned.height + deltaY,
    });

    await page.mouse.up();
    const afterRelease = await getRequiredBoundingBox(dialog, "the graph window after release");

    // Historical defect: resize continued to track the pointer after mouseup.
    await page.mouse.move(startX + deltaX + 200, startY + deltaY + 200, { steps: 5 });
    const afterStrayMove = await getRequiredBoundingBox(dialog, "the graph window after a stray post-release move");
    expectBoxClose(afterStrayMove, afterRelease, ["width", "height"]);

    await CloseFoblesGraph(page);
  });
});
