import { expect, foblesTest, type Page } from "../../../fixtures/playwright";
import {
  clickExtensionControl,
  getExtensionId,
  openExtensionPage,
} from "../../../fixtures/extension";
import { TEST_CONST } from "../../../TEST_CONST";
import { attachPageScreenshot } from "../../../helpers/fobles-helpers-support/screenshots";

foblesTest.describe("Extension UI Integration", () => {
  foblesTest(
    "opens Additional Settings from the popup",
    async ({ sharedBrowserContext }, testInfo) => {
      const extensionId = await getExtensionId(sharedBrowserContext);
      const popupPage = await openExtensionPage(
        sharedBrowserContext,
        extensionId,
        TEST_CONST.TESTING.EXTENSION_PAGES.POPUP,
      );
      let optionsPage: Page | undefined;

      try {
        await attachPageScreenshot(
          testInfo,
          popupPage,
          TEST_CONST.TESTING.REPORT_SCREENSHOTS.POPUP_DEFAULT,
        );
        const optionsPagePromise = sharedBrowserContext.waitForEvent("page");
        await clickExtensionControl(
          popupPage,
          popupPage.getByRole("button", {
            name: TEST_CONST.TESTING.POPUP.ADDITIONAL_SETTINGS_BUTTON,
          }),
          TEST_CONST.TESTING.POPUP.ADDITIONAL_SETTINGS_BUTTON,
        );
        optionsPage = await optionsPagePromise;
        await expect(optionsPage).toHaveURL(
          TEST_CONST.TESTING.EXTENSION_PAGES.OPTIONS_URL_PATTERN,
        );
        await expect(
          optionsPage.getByRole("heading", {
            name: TEST_CONST.TESTING.POPUP.HEADING,
          }),
        ).toBeVisible();
        await attachPageScreenshot(
          testInfo,
          optionsPage,
          TEST_CONST.TESTING.REPORT_SCREENSHOTS.DEVELOPER_SETTINGS,
        );
      } finally {
        if (optionsPage && !optionsPage.isClosed()) await optionsPage.close();
        if (!popupPage.isClosed()) await popupPage.close();
      }
    },
  );
});
