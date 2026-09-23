import { test, type Page } from "../fixtures/playwright";
import { CONST } from "../CONST";
import { RECORD_VIDEO } from "../../settings/VideoSwitch";
import { openSitecorePage } from "../fixtures/sitecore";
import { clickLbolt, clickTreeFoblesButton, clickTreeJump, dragToolbarTo, scrollTreeContainer } from "../sitecore-macros";
import { resolveCornerPosition, showMouseMarker } from "../mouse-proxy";
import { findFrameWithSelector } from "../frame-finder";
import { getExtensionId, setFoblesNavWarningVisible } from "../fixtures/extension";
import { playDemoBeat } from "./demo-beat";
import { videoTestSetup } from "./video-test-setup";

test.describe("Promo Video", () => {
  test("promo video", async ({ page: sharedPage, sharedBrowserContext }) => {
    test.setTimeout(CONST.TIMEOUTS.TEST_SUITE_MS);
    let testError: unknown;

    const page = RECORD_VIDEO ? await sharedBrowserContext.newPage() : sharedPage;

    try {
      await videoTestSetup(page);
      await demoToolbarDrag(page);
      await showMouseMarker(page);
      await demoTreeFoblesClick(page);
      await demoTreeJumpMenu(page);
      await demoLBoltToggle(page);
    } catch (error) {
      testError = error;
      console.log(
        `[fobles] Promo video scene failed: ${error instanceof Error ? (error.stack ?? error.message) : String(error)}`,
      );
    } finally {
      const extensionId = await getExtensionId(sharedBrowserContext);
      await setFoblesNavWarningVisible(sharedBrowserContext, extensionId, true);
    }

    if (RECORD_VIDEO) await page.close();

  });
});

async function demoLBoltToggle(page: Page) {
  await playDemoBeat(page, {
    name: "DemoLBoltToggle",
    init: async () => {
      await openSitecorePage(
        page,
        `${CONST.SITECORE.PATHS.CONTENT_EDITOR}&fo=75D27C2B-5F88-4CC8-B1DE-8412A1628408&sc_lang=en`,
      );
      await showMouseMarker(page);
    },
    speechText: "Click LBolt to turn Fobles on for this item",
    action: () => clickLbolt(page),
  });
}

async function demoTreeJumpMenu(page: Page) {
  await playDemoBeat(page, {
    name: "DemoTreeJumpMenu-ClickSameTab",
    speechText: "Click opens the tree jump path in the same tab",
    action: () => clickTreeJump(page, CONST.SITECORE.TREE_JUMP_PATHS.LAYOUT_RENDERINGS),
  });

  await playDemoBeat(page, {
    name: "DemoTreeJumpMenu-CtrlClickNewTab",   
    speechText: "Ctrl + Click opens the tree jump path in a new tab",
    action: () => clickTreeJump(page, CONST.SITECORE.TREE_JUMP_PATHS.MEDIA_LIBRARY),
  });
}

async function demoTreeFoblesClick(page: Page) {
  await playDemoBeat(page, {
    init: () => scrollTreeContainer(page, 400),
    name: "demoTreeFoblesClick-ClickLBolt",    
    speechText: "Click LBolt to turn Fobles on for this item",
    action: () => clickLbolt(page),
  });

  await playDemoBeat(page, {
    name: "demoTreeFoblesClick-ClickFobles",
    speechText: "Click the Fobles button to jump straight to that item",
    action: () => clickTreeFoblesButton(page, "CDD3F21381BB47708FEC4E1DD65EAA66"),
  });
}

async function demoToolbarDrag(page: Page) {
  const foblesFrame = await findFrameWithSelector(page, CONST.SITECORE.SELECTORS.TOOLBAR_CONTAINER, "Fobles toolbar");
  const toolbarGrip = foblesFrame.locator(CONST.SITECORE.SELECTORS.TOOLBAR_GRIP).first();
  const viewport = page.viewportSize();
  if (!viewport) throw new Error("Could not read viewport size");

  await playDemoBeat(page, {
    name: "demoToolbarDrag",
    init: () => showMouseMarker(foblesFrame),
    speechText: "Drag the toolbar anywhere on the page",
    action: () => dragToolbarTo(page, toolbarGrip, resolveCornerPosition(viewport, CONST.TOOLBAR_DRAG_POSITIONS.POSITION_2)),
    highlightResult: false,
  });

  await dragToolbarTo(page, toolbarGrip, resolveCornerPosition(viewport, CONST.TOOLBAR_DRAG_POSITIONS.POSITION_3));
  await dragToolbarTo(page, toolbarGrip, resolveCornerPosition(viewport, CONST.TOOLBAR_DRAG_POSITIONS.DEFAULT));
}
