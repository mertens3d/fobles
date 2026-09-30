import { expect, foblesTest, type Locator } from "../../../fixtures/playwright";
import { getExtensionId, openExtensionPage } from "../../../fixtures/extension";
import { CONST } from "../../../CONST";
import { clickWithMouseMarker } from "../../../helpers/mouse-proxy";
import {
  openSitecorePageAndFindFoblesFrame,
  createStep,
  attachScreenshot,
  attachItemPathScreenshot,
} from "../../../helpers/fobles-helpers";
import { ClickFoblesMenuButton } from "../../../macros/fobles-macros";
import { expectFlyoutVisible } from "../../../expectSnippets/expectSnippets";
import { humanPause } from "../../../helpers/wait-helpers";
import { bringPageToFront } from "../../../helpers/page-switch";
import { addTestRow, removeTestRowIfPresent, setTestRowEnabled } from "../../toolbar/support/other-settings-helpers";

foblesTest.describe("User Tree Jumps", () => {
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
      const foblesFrame = await openSitecorePageAndFindFoblesFrame(page);

      await ClickFoblesMenuButton(page);
      await expectFlyoutVisible(foblesFrame);
      await humanPause(page);

      await step("does not render with an empty list", async () => {
        await expect(foblesFrame.getByText("User Tree Jumps")).toHaveCount(0);
      });

      let row!: Locator;
      await step("appears live after saving, without a page refresh", async () => {
        row = await addTestRow(optionsPage);
        await bringPageToFront(page);
        await expect(foblesFrame.getByText("User Tree Jumps")).toBeVisible();
        await expect(foblesFrame.getByRole("button", { name: CONST.TESTING.ADDITIONAL_SETTINGS.TEST_JUMP.label })).toBeVisible();
      });

      await step("hides live again once disabled", async () => {
        await setTestRowEnabled(optionsPage, row, false);
        await bringPageToFront(page);
        await expect(foblesFrame.getByText("User Tree Jumps")).toHaveCount(0);
      });

      await step(`re-enabled entry navigates to "${CONST.TESTING.ADDITIONAL_SETTINGS.TEST_JUMP_PATH}"`, async (fullTitle) => {
        await setTestRowEnabled(optionsPage, row, true);
        await bringPageToFront(page);
        const jumpButton = foblesFrame.getByRole("button", { name: CONST.TESTING.ADDITIONAL_SETTINGS.TEST_JUMP.label });
        await expect(jumpButton).toBeVisible();
        await expect(jumpButton).toHaveAttribute(CONST.FOBLES.ATTRIBUTES.TREE_JUMP_PATH, CONST.TESTING.ADDITIONAL_SETTINGS.TEST_JUMP_PATH);
        await humanPause(page);
        await jumpButton.scrollIntoViewIfNeeded();
        await attachScreenshot(
          testInfo,
          foblesFrame.locator(CONST.FOBLES.SELECTORS.JUMP_MENU),
          CONST.TESTING.REPORT_SCREENSHOTS.USER_TREE_JUMP_MENU,
        );
        await clickWithMouseMarker(page, jumpButton, CONST.TESTING.ADDITIONAL_SETTINGS.TEST_JUMP.label);

        const confirmationDialog = foblesFrame.getByRole("dialog");
        await expect(confirmationDialog).toBeVisible();
        await humanPause(page);
        await Promise.all([
          page.waitForURL((url) => url.toString().includes(encodeURI(CONST.TESTING.ADDITIONAL_SETTINGS.TEST_JUMP_PATH)), {
            timeout: CONST.TESTING.TIMEOUTS.URL_WAIT_MS,
          }),
          await humanPause(page),
          clickWithMouseMarker(
            page,
            confirmationDialog.getByRole("button", { name: CONST.FOBLES.LABELS.CONTINUE_BUTTON }),
            "Confirm dialog Continue",
          ),
          await humanPause(page),
        ]);
        expect(page.url()).toContain(encodeURI(CONST.TESTING.ADDITIONAL_SETTINGS.TEST_JUMP_PATH));
        await attachItemPathScreenshot(page, testInfo, fullTitle);
      }, { screenshot: false });
    } finally {
      await removeTestRowIfPresent(optionsPage);
      await optionsPage.close();
    }
  });
  });
});
