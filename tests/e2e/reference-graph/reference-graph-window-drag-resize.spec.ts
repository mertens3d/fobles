import { expect, foblesTest } from "../../fixtures/playwright";
import { TEST_CONST } from "../../constants/TEST_CONST";
import { ClickFoblesGraphButton, CloseFoblesGraph } from "../../macros/fobles-macros";
import { setupReferenceGraphState } from "../harvest/harvest-test-helpers";
import { expectBoxClose, getRequiredBoundingBox } from "../../helpers/shared-window-geometry-helpers";

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
    const titleBox = await getRequiredBoundingBox(titleBar, "the title bar");
    const startX = titleBox.x + titleBox.width / 2;
    const startY = titleBox.y + titleBox.height / 2;
    const deltaX = 80;
    const deltaY = 40;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + deltaX, startY + deltaY, { steps: 5 });

    const midDrag = await getRequiredBoundingBox(dialog, "the graph window mid-drag");
    expectBoxClose(midDrag, { x: before.x + deltaX, y: before.y + deltaY, width: before.width, height: before.height });

    await page.mouse.up();
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
    const handleBox = await getRequiredBoundingBox(resizeHandle, "the southeast resize handle");
    const startX = handleBox.x + handleBox.width / 2;
    const startY = handleBox.y + handleBox.height / 2;
    const deltaX = 60;
    const deltaY = 60;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + deltaX, startY + deltaY, { steps: 5 });

    const midResize = await getRequiredBoundingBox(dialog, "the graph window mid-resize");
    // Resizing from the southeast corner must not relocate the window.
    expectBoxClose(midResize, { x: before.x, y: before.y, width: before.width + deltaX, height: before.height + deltaY });

    await page.mouse.up();
    const afterRelease = await getRequiredBoundingBox(dialog, "the graph window after release");

    // Historical defect: resize continued to track the pointer after mouseup.
    await page.mouse.move(startX + deltaX + 200, startY + deltaY + 200, { steps: 5 });
    const afterStrayMove = await getRequiredBoundingBox(dialog, "the graph window after a stray post-release move");
    expectBoxClose(afterStrayMove, afterRelease, ["width", "height"]);

    await CloseFoblesGraph(page);
  });
});
