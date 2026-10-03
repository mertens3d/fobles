import { foblesTest } from "../../fixtures/playwright";
import { expectFoblesContainerDom, expectFoblesContainerVisible } from "../../expect-snippets/expect-snippets";
import { CONST } from "../../CONST";
import { createStep } from "../../helpers/fobles-helpers-support/test-step";
import { setupContentEditorForTestingBasic } from "../../helpers/fobles-helpers-support/test-setup";
import { moveMouseToDefault as moveMouseToDefault } from "../../helpers/mouse-proxy";
import { dragToolbarToCornerLocation } from "../../macros/fobles-macros";
import { waitForBrowser, humanPause } from "../../helpers/wait-helpers";
import { moveMouseTowardCenter } from "../../helpers/mouse-proxy-support/mouse-movement";

const STEP_WAIT_MS = CONST.TESTING.SPEED.SETTINGS[CONST.TESTING.SPEED.SELECTED].STEP_WAIT_MS;

// Content Editor's own default placement (DEFAULT_TOOLBAR_PLACEMENT, src/content/constants.ts)
// is "upper-right" - dragging toward the opposite corner (bottom-left) makes the snap
// unambiguous regardless of exact viewport size.
foblesTest.describe("Toolbar: drag to reposition", () => {
  foblesTest("dragging the toolbar container snaps it to the nearest corner", async ({ page }, testInfo) => {
    
    const step = createStep(page, testInfo, page, "Toolbar Drag");

    await step("Setup: initial conditions", async () => {
      await waitForBrowser(page, STEP_WAIT_MS);
      await setupContentEditorForTestingBasic(page);
      await expectFoblesContainerVisible(page);
    });

    await step("Drag: toolbar to POSITION_1", async () => {
      const viewport = page.viewportSize();
      if (!viewport) throw new Error("Could not read viewport size");

      await moveMouseToDefault(page);
      await dragToolbarToCornerLocation(page, CONST.TESTING.TOOLBAR_DRAG_POSITIONS.POSITION_1_UR);
      await expectFoblesContainerDom(page, CONST.TESTING.TOOLBAR_DRAG_POSITIONS.POSITION_1_UR.corner);
      await humanPause(page, STEP_WAIT_MS);
    });

    await step("Drag: toolbar to POSITION_2", async () => {
      await moveMouseTowardCenter(page);
      await dragToolbarToCornerLocation(page, CONST.TESTING.TOOLBAR_DRAG_POSITIONS.POSITION_2_BL);
      await expectFoblesContainerDom(page, CONST.TESTING.TOOLBAR_DRAG_POSITIONS.POSITION_2_BL.corner);
      await humanPause(page, STEP_WAIT_MS);

      await moveMouseTowardCenter(page);
      await dragToolbarToCornerLocation(page, CONST.TESTING.TOOLBAR_DRAG_POSITIONS.POSITION_3_BR);
      await expectFoblesContainerDom(page, CONST.TESTING.TOOLBAR_DRAG_POSITIONS.POSITION_3_BR.corner);
      await humanPause(page, STEP_WAIT_MS);
    });

    await step("Drag: toolbar to POSITION_DEFAULT", async () => {
      await moveMouseTowardCenter(page);
      await dragToolbarToCornerLocation(page, CONST.TESTING.TOOLBAR_DRAG_POSITIONS.DEFAULT_UR);
      await expectFoblesContainerDom(page, CONST.TESTING.TOOLBAR_DRAG_POSITIONS.DEFAULT_UR.corner);
      await humanPause(page, STEP_WAIT_MS);
    });
  });
});
