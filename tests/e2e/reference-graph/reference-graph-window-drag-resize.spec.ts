import { expect, foblesTest } from "../../fixtures/playwright";
import { TEST_CONST } from "../../constants/TEST_CONST";
import { ClickFoblesGraphButton, CloseFoblesGraph } from "../../macros/fobles-macros";
import { setupReferenceGraphState } from "../harvest/harvest-test-helpers";

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

    const before = await dialog.boundingBox();
    if (!before) throw new Error("Expected the graph window to have a bounding box.");

    const titleBox = await titleBar.boundingBox();
    if (!titleBox) throw new Error("Expected the title bar to have a bounding box.");
    const startX = titleBox.x + titleBox.width / 2;
    const startY = titleBox.y + titleBox.height / 2;
    const deltaX = 80;
    const deltaY = 40;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + deltaX, startY + deltaY, { steps: 5 });

    const midDrag = await dialog.boundingBox();
    if (!midDrag) throw new Error("Expected the graph window to have a bounding box mid-drag.");
    expect(midDrag.x).toBeCloseTo(before.x + deltaX, 0);
    expect(midDrag.y).toBeCloseTo(before.y + deltaY, 0);
    expect(midDrag.width).toBeCloseTo(before.width, 0);
    expect(midDrag.height).toBeCloseTo(before.height, 0);

    await page.mouse.up();
    const afterRelease = await dialog.boundingBox();
    if (!afterRelease) throw new Error("Expected the graph window to have a bounding box after release.");

    // Regression: pointer movement after release must not continue moving the window.
    await page.mouse.move(startX + deltaX + 200, startY + deltaY + 200, { steps: 5 });
    const afterStrayMove = await dialog.boundingBox();
    expect(afterStrayMove?.x).toBeCloseTo(afterRelease.x, 0);
    expect(afterStrayMove?.y).toBeCloseTo(afterRelease.y, 0);

    await CloseFoblesGraph(page);
  });

  foblesTest("southeast corner resize grows the window and stops on release", async ({ page }) => {
    foblesTest.setTimeout(TEST_CONST.TESTING.TIMEOUTS.TEST_SUITE_MS);

    await setupReferenceGraphState(page, { rawValues: false, standardFields: false });
    await ClickFoblesGraphButton(page);

    const dialog = page.locator(`#${TEST_CONST.FOBLES.DOM.IDS.DIALOG_ID}`);
    const resizeHandle = dialog.locator(".fobles-window-resize--se");
    await expect(dialog).toBeVisible();

    const before = await dialog.boundingBox();
    if (!before) throw new Error("Expected the graph window to have a bounding box.");

    const handleBox = await resizeHandle.boundingBox();
    if (!handleBox) throw new Error("Expected the southeast resize handle to have a bounding box.");
    const startX = handleBox.x + handleBox.width / 2;
    const startY = handleBox.y + handleBox.height / 2;
    const deltaX = 60;
    const deltaY = 60;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + deltaX, startY + deltaY, { steps: 5 });

    const midResize = await dialog.boundingBox();
    if (!midResize) throw new Error("Expected the graph window to have a bounding box mid-resize.");
    expect(midResize.width).toBeCloseTo(before.width + deltaX, 0);
    expect(midResize.height).toBeCloseTo(before.height + deltaY, 0);
    // Resizing from the southeast corner must not relocate the window.
    expect(midResize.x).toBeCloseTo(before.x, 0);
    expect(midResize.y).toBeCloseTo(before.y, 0);

    await page.mouse.up();
    const afterRelease = await dialog.boundingBox();
    if (!afterRelease) throw new Error("Expected the graph window to have a bounding box after release.");

    // Historical defect: resize continued to track the pointer after mouseup.
    await page.mouse.move(startX + deltaX + 200, startY + deltaY + 200, { steps: 5 });
    const afterStrayMove = await dialog.boundingBox();
    expect(afterStrayMove?.width).toBeCloseTo(afterRelease.width, 0);
    expect(afterStrayMove?.height).toBeCloseTo(afterRelease.height, 0);

    await CloseFoblesGraph(page);
  });
});
