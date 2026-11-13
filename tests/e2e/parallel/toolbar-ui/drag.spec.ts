import { foblesTest, type Page } from "../../../fixtures/playwright";
import { expectStaticToolbarPosition, expectFoblesContainerVisible } from "../../../expect-snippets/expect-snippets";
import { TEST_CONST } from "../../../constants/TEST_CONST";
import { createFoblesStep } from "../../../helpers/fobles-helpers-support/test-step";
import { setupParallelContentEditor } from "../../../helpers/fobles-helpers-support/test-setup";
import { moveMouseToDefault as moveMouseToDefault } from "../../../helpers/mouse-proxy";
import { dragToolbarToCornerLocation } from "../../../macros/fobles-macros";
import { pauseForBrowser, pauseForHuman } from "../../../helpers/wait-helpers";
import { moveMouseTowardCenter } from "../../../helpers/mouse-proxy-support/mouse-movement";
import type { CornerPosition } from "../../../helpers/helpers.types";

const STEP_WAIT_MS = TEST_CONST.TESTING.SPEED.SETTINGS[TEST_CONST.TESTING.SPEED.SELECTED].STEP_WAIT_MS;

// Content Editor's own default placement (DEFAULT_TOOLBAR_PLACEMENT, src/content/constants.ts)
// is "upper-right" - dragging toward the opposite corner (bottom-left) makes the snap
// unambiguous regardless of exact viewport size.
foblesTest.describe("positions", () => {
  foblesTest("persisted", async ({ page }, testInfo) => {
    const step = createFoblesStep(page, testInfo, page, "Toolbar Drag");

    await step("Setup: initial conditions", async () => {
      await pauseForBrowser(page, STEP_WAIT_MS);
      await setupParallelContentEditor(page, undefined, false);
      await expectFoblesContainerVisible(page);
      await moveMouseToDefault(page);
    });

    await step(`Drag: toolbar to '${TEST_CONST.TESTING.TOOLBAR_DRAG_POSITIONS.POSITION_1_UR.corner}'`, async () => {
      await positionTestCommon(page, TEST_CONST.TESTING.TOOLBAR_DRAG_POSITIONS.POSITION_1_UR);
    });

    await step(`Drag: toolbar to '${TEST_CONST.TESTING.TOOLBAR_DRAG_POSITIONS.POSITION_2_BL.corner}'`, async () => {
      await positionTestCommon(page, TEST_CONST.TESTING.TOOLBAR_DRAG_POSITIONS.POSITION_2_BL);

    });

    await step(`Drag: toolbar to '${TEST_CONST.TESTING.TOOLBAR_DRAG_POSITIONS.POSITION_3_BR.corner}'`, async () => {
      await positionTestCommon(page, TEST_CONST.TESTING.TOOLBAR_DRAG_POSITIONS.POSITION_3_BR);
    });

    await step(`Drag: toolbar to '${TEST_CONST.TESTING.TOOLBAR_DRAG_POSITIONS.DEFAULT_UR.corner}'`, async () => {
      await positionTestCommon(page, TEST_CONST.TESTING.TOOLBAR_DRAG_POSITIONS.DEFAULT_UR);
    });
  });
});

async function positionTestCommon(page: Page, cornerPosition: CornerPosition) {
  await moveMouseTowardCenter(page);
  await dragToolbarToCornerLocation(page, cornerPosition);
  await expectFoblesContainerVisible(page);
  await expectStaticToolbarPosition(page, cornerPosition.corner);
  await pauseForHuman(page, STEP_WAIT_MS);
}