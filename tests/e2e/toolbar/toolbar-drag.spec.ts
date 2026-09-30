import { test } from "../../fixtures/playwright";
import { expectFoblesContainerDom, expectFoblesContainerVisible } from "../../expectSnippets/expectSnippets";
import { CONST } from "../../CONST";
import { createStep, setupContentEditorForTestingBasic } from "../../helpers/fobles-helpers";
import { moveMouseToDefault as moveMouseToDefault } from "../../helpers/mouse-proxy";
import { dragToolbarToCornerLocation } from "../../macros/fobles-macros";
import { foblesWaitForTimeout } from "../../helpers/wait-helpers";

const STEP_WAIT_MS = CONST.TESTING.SPEED.SETTINGS[CONST.TESTING.SPEED.SELECTED].STEP_WAIT_MS;

// Content Editor's own default placement (DEFAULT_TOOLBAR_PLACEMENT, src/content/constants.ts)
// is "upper-right" - dragging toward the opposite corner (bottom-left) makes the snap
// unambiguous regardless of exact viewport size.
test.describe("Toolbar: drag to reposition", () => {
  test("dragging the toolbar container snaps it to the nearest corner", async ({ page }, testInfo) => {
    
    const step = createStep(page, testInfo, page, "Toolbar Drag");

    await step("Setup: initial conditions", async () => {
      await foblesWaitForTimeout(page, STEP_WAIT_MS);
      await setupContentEditorForTestingBasic(page);
      await expectFoblesContainerVisible(page);
    });

    await step("Drag: toolbar to POSITION_1", async () => {
      const viewport = page.viewportSize();
      if (!viewport) throw new Error("Could not read viewport size");

      await moveMouseToDefault(page);
      await dragToolbarToCornerLocation(page, CONST.TESTING.TOOLBAR_DRAG_POSITIONS.POSITION_1);
      await expectFoblesContainerDom(page, CONST.TESTING.TOOLBAR_DRAG_POSITIONS.POSITION_1.corner);
      await foblesWaitForTimeout(page, STEP_WAIT_MS);
    });

    await step("Drag: toolbar to POSITION_2", async () => {
      await moveMouseToDefault(page);
      await dragToolbarToCornerLocation(page, CONST.TESTING.TOOLBAR_DRAG_POSITIONS.POSITION_2);
      await expectFoblesContainerDom(page, CONST.TESTING.TOOLBAR_DRAG_POSITIONS.POSITION_2.corner);
      await foblesWaitForTimeout(page, STEP_WAIT_MS);

      await moveMouseToDefault(page);
      await dragToolbarToCornerLocation(page, CONST.TESTING.TOOLBAR_DRAG_POSITIONS.POSITION_3);
      await expectFoblesContainerDom(page, CONST.TESTING.TOOLBAR_DRAG_POSITIONS.POSITION_3.corner);
      await foblesWaitForTimeout(page, STEP_WAIT_MS);
    });

    await step("Drag: toolbar to POSITION_DEFAULT", async () => {
      await moveMouseToDefault(page);
      await dragToolbarToCornerLocation(page, CONST.TESTING.TOOLBAR_DRAG_POSITIONS.DEFAULT);
      await expectFoblesContainerDom(page, CONST.TESTING.TOOLBAR_DRAG_POSITIONS.DEFAULT.corner);
      await foblesWaitForTimeout(page, STEP_WAIT_MS);
    });
  });
});
