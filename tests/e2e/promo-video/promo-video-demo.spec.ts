import { foblesTest, type Page } from "../../fixtures/playwright";
import { CONST } from "../../CONST";
import { openSitecorePage } from "../../fixtures/sitecore";
import {   clickTreeJump,  scrollTreeContainer } from "../../macros/sitecore-macros";
import { resolveCornerPosition, ensureMouseMarkerExists } from "../../helpers/mouse-proxy";
import { findFrameWithSelector } from "../../helpers/frame-finder";
import { getExtensionId, setFoblesNavWarningVisible } from "../../fixtures/extension";
import { playDemoBeat } from "./demo-beat";
import { videoTestSetup } from "./video-test-setup";
import { RECORD_VIDEO } from "../../settings/settings";
import { clickLbolt, clickFoblesTreeButton, dragToolbarTo, dragToolbarToCornerLocation } from "../../macros/fobles-macros";
import { showSpeakBubble } from "../../helpers/speak-bubble";
import { moveMouseTowardCenter } from "../../helpers/mouse-proxy-support/mouse-movement";
import { demoSightings } from "./demo-sightings";

foblesTest.describe("Promo Video", () => {
  foblesTest("promo video", async ({ page: sharedPage, sharedBrowserContext }) => {
    foblesTest.setTimeout(CONST.TESTING.TIMEOUTS.TEST_SUITE_MS);
    let testError: unknown;

    const page = RECORD_VIDEO ? await sharedBrowserContext.newPage() : sharedPage;

    try {
      await ensureMouseMarkerExists(page);
      await videoTestSetup(page);
      await demoToolbarDrag(page);
      await demoTreeFoblesClick(page);
      // await demoTreeJumpFlyout(page);
      // await demoLBoltToggle(page);
      await demoSightings(page, sharedBrowserContext);
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
        `${CONST.SITECORE.PATHS.CONTENT_EDITOR_BW_ENCODED}&fo=75D27C2B-5F88-4CC8-B1DE-8412A1628408&sc_lang=en`,
      );
      await ensureMouseMarkerExists(page);
    },
    speechText: "Click LBolt to turn Fobles on for this item",
    action: () => clickLbolt(page),
  });
}

async function demoTreeJumpFlyout(page: Page) {



  await clickLbolt(page)
  await showSpeakBubble(page, "Click opens the tree jump path in the same tab. <br/>Ctrl + Click opens it in a new tab.");
  await clickTreeJump(page, CONST.SITECORE.TREE_JUMP_PATHS.LAYOUT_RENDERINGS);
  // await playDemoBeat(page, {
  //   name: "DemoTreeJumpFlyout-ClickSameTab",
  //   speechText: "Click opens the tree jump path in the same tab",
  //   action: () => clickTreeJump(page, CONST.SITECORE.TREE_JUMP_PATHS.LAYOUT_RENDERINGS),
  // });

  // await playDemoBeat(page, {
  //   name: "DemoTreeJumpFlyout-CtrlClickNewTab",   
  //   speechText: "Ctrl + Click opens the tree jump path in a new tab",
  //   action: () => clickTreeJump(page, CONST.SITECORE.TREE_JUMP_PATHS.MEDIA_LIBRARY),
  // });
}

async function demoTreeFoblesClick(page: Page) {
  // await playDemoBeat(page, {
  //   init: () => scrollTreeContainer(page, 400),
  //   name: "demoTreeFoblesClick-ClickLBolt",    
  //   speechText: "Click LBolt to turn Fobles on for this item",
  //   action: () => clickLbolt(page),
  // });
  await showSpeakBubble(page, "Activate Fobles");
  await scrollTreeContainer(page, 400);
  await clickLbolt(page);


  await showSpeakBubble(page, "Click opens the tree jump path in the same tab. <br/>Ctrl + Click opens it in a new tab.");
  await clickFoblesTreeButton(page, "CDD3F21381BB47708FEC4E1DD65EAA66");
  // await playDemoBeat(page, {
  //   name: "demoTreeFoblesClick-ClickFobles",
  //   speechText: "Click the Fobles button to jump straight to that item",
  //   action: () => clickFoblesTreeButton(page, "CDD3F21381BB47708FEC4E1DD65EAA66"),
  // });
}

async function demoToolbarDrag(page: Page) {
  // const foblesFrame = await findFrameWithSelector(page, CONST.FOBLES.SELECTORS.TOOLBAR_CONTAINER, "Fobles toolbar");
  // const toolbarGrip = foblesFrame.locator(CONST.FOBLES.SELECTORS.TOOLBAR_GRIP).first();

  // await playDemoBeat(page, {
  //   name: "demoToolbarDrag",
  //   init: () => ensureMouseMarkerExists(foblesFrame),
  //   speechText: "Drag the toolbar anywhere on the page",
  //   action: () => dragToolbarToCornerLocation  (page, CONST.TESTING.TOOLBAR_DRAG_POSITIONS.POSITION_2),
  //   highlightResult: false,
  // });

 
  await showSpeakBubble(page, "Drag the toolbar anywhere on the page", CONST.TESTING.SPEAK_BUBBLE.DEFAULT_SPEECH_POSITION);
  await dragToolbarToCornerLocation  (page, CONST.TESTING.TOOLBAR_DRAG_POSITIONS.POSITION_2_BL);

  await moveMouseTowardCenter(page);

  await dragToolbarToCornerLocation  (page, CONST.TESTING.TOOLBAR_DRAG_POSITIONS.POSITION_3_BR);
  await moveMouseTowardCenter(page);

  await dragToolbarToCornerLocation  (page, CONST.TESTING.TOOLBAR_DRAG_POSITIONS.DEFAULT_UR);
}
