import { expect, foblesTest, type Locator } from "../../fixtures/playwright";
import { getExtensionId, openExtensionPage } from "../../fixtures/extension";
import { CONST } from "../../CONST";
import { clickWithMouseMarker } from "../../helpers/mouse-proxy";
import { openContentEditor } from "../../fixtures/sitecore";
import { findFoblesFrame } from "../../helpers/frame-finder";
import { createStep } from "../../helpers/fobles-helpers-support/test-step";
import { ClickFoblesJumpButton } from "../../macros/fobles-macros";
import { addTestRow, openTreeJumpsColumn, removeTestRowIfPresent, setTestRowEnabled } from "./support/other-settings-helpers";

foblesTest.describe("User Tree Jumps", () => {
  foblesTest.describe("Persistence", () => {
  foblesTest("Additional Settings adds and normalizes a User Tree Jump", async ({ sharedBrowserContext }) => {
    foblesTest.setTimeout(CONST.TESTING.TIMEOUTS.TEST_SUITE_MS);
    const extensionId = await getExtensionId(sharedBrowserContext);
    const optionsPage = await openExtensionPage(sharedBrowserContext, extensionId, "options");

    try {
      await removeTestRowIfPresent(optionsPage);
      await addTestRow(optionsPage);

      // Reload and re-open rather than trusting the in-memory row - proves the normalized values
      // actually round-tripped through storage, not just what the fields happened to still show.
      await optionsPage.reload();
      const treeJumpsColumn = await openTreeJumpsColumn(optionsPage);
      const row = treeJumpsColumn.locator(".user-tree-jump-row").last();
      await expect(row.locator("input[name='label']")).toHaveValue(CONST.TESTING.ADDITIONAL_SETTINGS.TEST_JUMP.label);
      await expect(row.locator("input[name='pathSuffix']")).toHaveValue(
        CONST.TESTING.ADDITIONAL_SETTINGS.TEST_JUMP.pathSuffixRaw.replace(/^\/+/, ""),
      );
      await expect(row.locator("input[name='icon']")).toHaveValue(CONST.TESTING.ADDITIONAL_SETTINGS.TEST_JUMP_ICON_NORMALIZED);
      await expect(row.locator("input[name='enabled']")).toBeChecked();
    } finally {
      await removeTestRowIfPresent(optionsPage);
      await optionsPage.close();
    }
  });
  });

  foblesTest.describe("Toolbar Integration", () => {
  foblesTest("toolbar renders, live-updates, hides, and navigates a User Tree Jump", async ({
    sharedBrowserContext,
    page,
  }, testInfo) => {
    foblesTest.setTimeout(CONST.TESTING.TIMEOUTS.TEST_SUITE_MS);
    const extensionId = await getExtensionId(sharedBrowserContext);
    const optionsPage = await openExtensionPage(sharedBrowserContext, extensionId, "options");
    const step = createStep(page, testInfo, page, "User Tree Jump");

    try {
      await removeTestRowIfPresent(optionsPage);
      await openContentEditor(page, CONST.SITECORE.DOM.TREE_NODE_IDS.CONTENT);
      const foblesFrame = await findFoblesFrame(page);

      await ClickFoblesJumpButton(page);

      await step("does not render with an empty list", async () => {
        await expect(foblesFrame.getByText("User Tree Jumps")).toHaveCount(0);
      }, { screenshot: false });

      let row!: Locator;
      await step("appears live after saving, without a page refresh", async () => {
        row = await addTestRow(optionsPage);
        await expect(foblesFrame.getByText("User Tree Jumps")).toBeVisible();
        await expect(foblesFrame.getByRole("button", { name: CONST.TESTING.ADDITIONAL_SETTINGS.TEST_JUMP.label })).toBeVisible();
      });

      await step("hides live again once disabled", async () => {
        await setTestRowEnabled(optionsPage, row, false);
        await expect(foblesFrame.getByText("User Tree Jumps")).toHaveCount(0);
      });

      await step(`re-enabled entry navigates to "${CONST.TESTING.ADDITIONAL_SETTINGS.TEST_JUMP_PATH}"`, async () => {
        await setTestRowEnabled(optionsPage, row, true);
        const jumpButton = foblesFrame.getByRole("button", { name: CONST.TESTING.ADDITIONAL_SETTINGS.TEST_JUMP.label });
        await expect(jumpButton).toBeVisible();
        await expect(jumpButton).toHaveAttribute(CONST.FOBLES.ATTRIBUTES.TREE_JUMP_PATH, CONST.TESTING.ADDITIONAL_SETTINGS.TEST_JUMP_PATH);
        await jumpButton.scrollIntoViewIfNeeded();
        await clickWithMouseMarker(page, jumpButton, CONST.TESTING.ADDITIONAL_SETTINGS.TEST_JUMP.label);

        const confirmationDialog = foblesFrame.getByRole("dialog");
        await expect(confirmationDialog).toBeVisible();
        await Promise.all([
          page.waitForURL((url) => url.toString().includes(encodeURI(CONST.TESTING.ADDITIONAL_SETTINGS.TEST_JUMP_PATH)), {
            timeout: CONST.TESTING.TIMEOUTS.URL_WAIT_MS,
          }),
          clickWithMouseMarker(
            page,
            confirmationDialog.getByRole("button", { name: CONST.FOBLES.LABELS.CONTINUE_BUTTON }),
            "Confirm dialog Continue",
          ),
        ]);
        expect(page.url()).toContain(encodeURI(CONST.TESTING.ADDITIONAL_SETTINGS.TEST_JUMP_PATH));
      }, { screenshot: false });
    } finally {
      await removeTestRowIfPresent(optionsPage);
      await optionsPage.close();
    }
  });
  });
});
