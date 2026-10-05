import { expect, foblesTest } from "../../fixtures/playwright";
import { CONST } from "../../CONST";
import { getExtensionId, setFoblesNavVisible } from "../../fixtures/extension";
import { createFoblesStep } from "../../helpers/fobles-helpers-support/test-step";
import { openContentEditor } from "../../fixtures/sitecore";
import { findFoblesFrame, findFrameWithSelector } from "../../helpers/frame-finder";
import { pressToggleFoblesToolbarHotkey, pressToggleLboltHotkey } from "../../macros/fobles-macros";

const CONTENT_TREE_PANEL_SELECTOR = "#ContentTreeInnerPanel";

foblesTest.describe("Fobles keyboard shortcuts", () => {
  foblesTest(
    "toggle-fobles hotkey shows/hides the toolbar, same as the popup's nav-visible checkbox",
    async ({ sharedBrowserContext, page }, testInfo) => {
      foblesTest.setTimeout(CONST.TESTING.TIMEOUTS.TEST_SUITE_MS);
      const extensionId = await getExtensionId(sharedBrowserContext);
      const step = createFoblesStep(page, testInfo, page, "Hotkeys");
      await openContentEditor(page, CONST.SITECORE.DOM.TREE_NODE_IDS.CONTENT);
      const foblesFrame = await findFoblesFrame(page);
      const toolbarContainer = foblesFrame.locator(CONST.FOBLES.SELECTORS.TOOLBAR_CONTAINER);

      try {
        await step("starts visible", async () => {
          await setFoblesNavVisible(sharedBrowserContext, extensionId, true);
          await expect(toolbarContainer).toBeVisible();
        });

        await step("hotkey hides the toolbar", async () => {
          await pressToggleFoblesToolbarHotkey(sharedBrowserContext);
          await expect(toolbarContainer).toHaveCount(0);
        });

        await step("hotkey shows the toolbar again", async () => {
          await pressToggleFoblesToolbarHotkey(sharedBrowserContext);
          await expect(toolbarContainer).toBeVisible();
        });
      } finally {
        // Leaves nav visibility on for every other suite sharing this persistent profile.
        await setFoblesNavVisible(sharedBrowserContext, extensionId, true);
      }
    },
  );

  foblesTest(
    "toggle-lbolt hotkey toggles Fobles tree buttons, same as clicking LBolt",
    async ({ page, sharedBrowserContext }, testInfo) => {
      foblesTest.setTimeout(CONST.TESTING.TIMEOUTS.TEST_SUITE_MS);
      const step = createFoblesStep(page, testInfo, page, "Hotkeys");
      await openContentEditor(page, CONST.SITECORE.DOM.TREE_NODE_IDS.CONTENT);
      await findFoblesFrame(page);
      const treeFrame = await findFrameWithSelector(page, CONTENT_TREE_PANEL_SELECTOR, "content tree panel", 10_000);
      const treeFoblesButtons = treeFrame.locator(CONST.FOBLES.SELECTORS.TREE_FOBLES_BUTTON);

      await step("starts with no Fobles tree buttons", async () => {
        await expect(treeFoblesButtons).toHaveCount(0);
      });

      await step("turns tree buttons on", async () => {
        await pressToggleLboltHotkey(sharedBrowserContext);
        await expect(treeFoblesButtons.first()).toBeVisible();
      });

      await step("turns tree buttons off", async () => {
        await pressToggleLboltHotkey(sharedBrowserContext);
        await expect(treeFoblesButtons).toHaveCount(0);
      });
    },
  );
});
