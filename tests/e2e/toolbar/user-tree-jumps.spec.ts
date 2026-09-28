import { expect, test, type Locator } from "../fixtures/playwright";
import { getExtensionId, openExtensionPage } from "../fixtures/extension";
import { CONST } from "../CONST";
import { clickWithMouseMarker } from "../mouse-proxy";
import { openSitecorePageAndFindFoblesFrame, createStep } from "../fobles-helpers";
import { ClickFoblesMenuButton } from "../macros/fobles-macros";
import { expectFlyoutVisible } from "../expectSnippets/expectSnippets";
import { addTestRow, openTreeJumpsColumn, removeTestRowIfPresent, setTestRowEnabled } from "./OtherSettings.spec";

test.describe("User Tree Jumps", () => {
  test("Additional Settings adds and normalizes a User Tree Jump", async ({ sharedBrowserContext }) => {
    test.setTimeout(CONST.TIMEOUTS.TEST_SUITE_MS);
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
      await expect(row.locator("input[name='label']")).toHaveValue(CONST.FOBLES.ADDITIONAL_SETTINGS.TEST_JUMP.label);
      await expect(row.locator("input[name='pathSuffix']")).toHaveValue(
        CONST.FOBLES.ADDITIONAL_SETTINGS.TEST_JUMP.pathSuffixRaw.replace(/^\/+/, ""),
      );
      await expect(row.locator("input[name='icon']")).toHaveValue(CONST.FOBLES.ADDITIONAL_SETTINGS.TEST_JUMP_ICON_NORMALIZED);
      await expect(row.locator("input[name='enabled']")).toBeChecked();
    } finally {
      await removeTestRowIfPresent(optionsPage);
      await optionsPage.close();
    }
  });

  test("toolbar renders, live-updates, hides, and navigates a User Tree Jump", async ({
    sharedBrowserContext,
    page,
  }, testInfo) => {
    test.setTimeout(CONST.TIMEOUTS.TEST_SUITE_MS);
    const extensionId = await getExtensionId(sharedBrowserContext);
    const optionsPage = await openExtensionPage(sharedBrowserContext, extensionId, "options");
    const step = createStep(page, testInfo, page, "User Tree Jump");

    try {
      await removeTestRowIfPresent(optionsPage);
      const foblesFrame = await openSitecorePageAndFindFoblesFrame(page);

      await ClickFoblesMenuButton(page, foblesFrame, "User Tree Jump menu");
      await expectFlyoutVisible(foblesFrame);

      await step("does not render with an empty list", async () => {
        await expect(foblesFrame.getByText("User Tree Jumps")).toHaveCount(0);
      }, { screenshot: false });

      let row!: Locator;
      await step("appears live after saving, without a page refresh", async () => {
        row = await addTestRow(optionsPage);
        await expect(foblesFrame.getByText("User Tree Jumps")).toBeVisible();
        await expect(foblesFrame.getByRole("button", { name: CONST.FOBLES.ADDITIONAL_SETTINGS.TEST_JUMP.label })).toBeVisible();
      });

      await step("hides live again once disabled", async () => {
        await setTestRowEnabled(optionsPage, row, false);
        await expect(foblesFrame.getByText("User Tree Jumps")).toHaveCount(0);
      });

      await step(`re-enabled entry navigates to "${CONST.FOBLES.ADDITIONAL_SETTINGS.TEST_JUMP_PATH}"`, async () => {
        await setTestRowEnabled(optionsPage, row, true);
        const jumpButton = foblesFrame.getByRole("button", { name: CONST.FOBLES.ADDITIONAL_SETTINGS.TEST_JUMP.label });
        await expect(jumpButton).toBeVisible();
        await expect(jumpButton).toHaveAttribute("data-fobles-tree-jump-path", CONST.FOBLES.ADDITIONAL_SETTINGS.TEST_JUMP_PATH);
        await jumpButton.scrollIntoViewIfNeeded();
        await clickWithMouseMarker(page, jumpButton, CONST.FOBLES.ADDITIONAL_SETTINGS.TEST_JUMP.label);

        const confirmationDialog = foblesFrame.getByRole("dialog");
        await expect(confirmationDialog).toBeVisible();
        await Promise.all([
          page.waitForURL((url) => url.toString().includes(encodeURI(CONST.FOBLES.ADDITIONAL_SETTINGS.TEST_JUMP_PATH)), {
            timeout: CONST.TIMEOUTS.URL_WAIT_MS,
          }),
          clickWithMouseMarker(
            page,
            confirmationDialog.getByRole("button", { name: CONST.SITECORE.LABELS.CONTINUE_BUTTON }),
            "Confirm dialog Continue",
          ),
        ]);
        expect(page.url()).toContain(encodeURI(CONST.FOBLES.ADDITIONAL_SETTINGS.TEST_JUMP_PATH));
      }, { screenshot: false });
    } finally {
      await removeTestRowIfPresent(optionsPage);
      await optionsPage.close();
    }
  });
});
