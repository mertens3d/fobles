import { expect, foblesTest, type Locator } from "../../fixtures/playwright";
import { getExtensionId, setFoblesNavWarningVisible } from "../../fixtures/extension";
import { CONST } from "../../CONST";
import { clickWithMouseMarker } from "../../helpers/mouse-proxy";
import { clickTreeJump } from "../../macros/sitecore-macros";
import { openContentEditor } from "../../fixtures/sitecore";
import { findFoblesFrame } from "../../helpers/frame-finder";
import { createStep } from "../../helpers/fobles-helpers-support/test-step";

foblesTest.describe("Same-tab navigation warning setting", () => {
  foblesTest.skip("popup checkbox shows/hides Fobles' confirm dialog on the next same-tab jump", async ({
    sharedBrowserContext,
    page,
  }, testInfo) => {
    foblesTest.setTimeout(CONST.TESTING.TIMEOUTS.TEST_SUITE_MS);
    const extensionId = await getExtensionId(sharedBrowserContext);
    const step = createStep(page, testInfo, page, "Nav Warning Setting");

    // Re-navigates to the scenario item and clicks a tree jump button - the same setup every
    // jump test uses - then hands back whatever (if anything) shows up as a "dialog". Skips the
    // macro's own auto-dismiss since this test needs to inspect/click the dialog itself.
    const jumpAndGetDialog = async (): Promise<Locator> => {
      await openContentEditor(page, CONST.SITECORE.DOM.TREE_NODE_IDS.CONTENT);
      const foblesFrame = await findFoblesFrame(page);
      await clickTreeJump(page, CONST.SITECORE.TREE_JUMP_PATHS.TEMPLATES, {
        skipDialogDismiss: true,
      });
      return foblesFrame.getByRole("dialog");
    };

    try {
      await step("dialog appears while the warning setting is on", async () => {
        await setFoblesNavWarningVisible(sharedBrowserContext, extensionId, true);
        const dialog = await jumpAndGetDialog();
        await expect(dialog).toBeVisible();
        await clickWithMouseMarker(
          page,
          dialog.getByRole("button", { name: CONST.FOBLES.LABELS.CONTINUE_BUTTON }),
          "Confirm dialog Continue",
        );
      });

      await step("dialog no longer appears once the setting is turned off", async () => {
        await setFoblesNavWarningVisible(sharedBrowserContext, extensionId, false);
        const dialog = await jumpAndGetDialog();
        await expect(dialog).toHaveCount(0);
      });

      await step("dialog appears again once the setting is turned back on", async () => {
        await setFoblesNavWarningVisible(sharedBrowserContext, extensionId, true);
        const dialog = await jumpAndGetDialog();
        await expect(dialog).toBeVisible();
        await clickWithMouseMarker(
          page,
          dialog.getByRole("button", { name: CONST.FOBLES.LABELS.CONTINUE_BUTTON }),
          "Confirm dialog Continue",
        );
      });
    } finally {
      // Leaves the warning on for every other suite sharing this persistent profile, regardless
      // of which step above this test happened to fail on.
      await setFoblesNavWarningVisible(sharedBrowserContext, extensionId, true);
    }
  });
});
