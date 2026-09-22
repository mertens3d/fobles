import { test } from "../fixtures/playwright";
import { CONST } from "../CONST";
import { RECORD_VIDEO } from "../../settings/VideoSwitch";
import { openSitecorePage } from "../fixtures/sitecore";
import { showMouseMarker } from "../mouse-proxy";
import { clickLbolt, clickTreeFoblesButton, clickTreeJump, highlightQuickInfoPath, scrollTreeContainer, setTreePanelWidth } from "../sitecore-macros";
import { showSpeakBubble, hideSpeakBubble } from "../speak-bubble";
import { getExtensionId, setFoblesNavWarningVisible } from "../fixtures/extension";

const SCENE_PAUSE_MS = 2_500;

test.describe("Promo: short feature walkthrough", () => {
  test("field strategies, Quick Info, and tree jumps", async ({ page: sharedPage, sharedBrowserContext }) => {
    test.setTimeout(CONST.TIMEOUTS.TEST_SUITE_MS);
    // const extensionId = await getExtensionId(sharedBrowserContext);
    let testError: unknown;

    // 00-session-start.spec.ts already ran on sharedPage and handled any interactive login wait -
    // recording on a fresh page created only now means that dead time never ends up in the video.
    const page = RECORD_VIDEO ? await sharedBrowserContext.newPage() : sharedPage;

    try {
      await setTreePanelWidth(page, 250);
      await openSitecorePage(
        page,
        "/sitecore/shell/Applications/Content Editor.aspx?sc_bw=1&fo=E1AF4AA3-3B5D-4611-8C71-959AD261E5B7",
      );
      await showMouseMarker(page);

      await scrollTreeContainer(page, 400);
      await showSpeakBubble(page, "Click LBolt to turn Fobles on for this item", { xPercent: 50, yPercent: 90 });
      await clickLbolt(page);
      await hideSpeakBubble(page);

      await showSpeakBubble(page, "Click the Fobles button to jump straight to that item", { xPercent: 50, yPercent: 90 });
      await clickTreeFoblesButton(page, "CDD3F21381BB47708FEC4E1DD65EAA66", { turnOffWarning: true });
      await hideSpeakBubble(page);
      await highlightQuickInfoPath(page);

      console.log(`[fobles] Scene pause: waiting ${SCENE_PAUSE_MS}ms`);
      await page.waitForTimeout(SCENE_PAUSE_MS);

      await showSpeakBubble(page, "Click opens the tree jump path in the same tab", { xPercent: 50, yPercent: 90 });
      await clickTreeJump(page, CONST.SITECORE.TREE_JUMP_PATHS.LAYOUT_RENDERINGS, {
        turnOffWarning: true,
      });
      await hideSpeakBubble(page);
      await highlightQuickInfoPath(page);

      console.log(`[fobles] Scene pause: waiting ${SCENE_PAUSE_MS}ms`);
      await page.waitForTimeout(SCENE_PAUSE_MS);

      await showSpeakBubble(page, "Ctrl + Click opens the tree jump path in a new tab", { xPercent: 50, yPercent: 90 });
      await clickTreeJump(page, CONST.SITECORE.TREE_JUMP_PATHS.MEDIA_LIBRARY, {
        turnOffWarning: true,
      });
      await hideSpeakBubble(page);
      await highlightQuickInfoPath(page);

      console.log(`[fobles] Scene pause: waiting ${SCENE_PAUSE_MS}ms`);
      await page.waitForTimeout(SCENE_PAUSE_MS);

      await openSitecorePage(
        page,
        "/sitecore/shell/Applications/Content Editor.aspx?sc_bw=1&fo=75D27C2B-5F88-4CC8-B1DE-8412A1628408&sc_lang=en",
      );
      await showMouseMarker(page);
      await showSpeakBubble(page, "Click LBolt to turn Fobles on for this item", { xPercent: 50, yPercent: 90 });
      await clickLbolt(page);
      await hideSpeakBubble(page);
    } catch (error) {
      testError = error;
      console.log(
        `[fobles] Promo video scene failed: ${error instanceof Error ? (error.stack ?? error.message) : String(error)}`,
      );
    }

    // Closes the recording promptly instead of leaving it open (and recording an idle tail) until
    // the whole worker's context.close() runs, which happens after zz-session-end.spec.ts too.
    if (RECORD_VIDEO) await page.close();

    // await setFoblesNavWarningVisible(sharedBrowserContext, extensionId, true);
    // if (testError) throw testError;
  });
});
