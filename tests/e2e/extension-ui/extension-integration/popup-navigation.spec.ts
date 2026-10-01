import { expect, foblesTest, type Page } from "../../../fixtures/playwright";
import {
  clickExtensionControl,
  getExtensionId,
  openExtensionPage,
} from "../../../fixtures/extension";
import { CONST } from "../../../CONST";
import { attachPageScreenshot } from "../../../helpers/fobles-helpers";

foblesTest.describe("Extension UI Integration", () => {
  foblesTest(
    "opens Additional Settings from the popup",
    async ({ sharedBrowserContext }, testInfo) => {
      const extensionId = await getExtensionId(sharedBrowserContext);
      const popupPage = await openExtensionPage(
        sharedBrowserContext,
        extensionId,
        CONST.TESTING.EXTENSION_PAGES.POPUP,
      );
      let optionsPage: Page | undefined;

      try {
        await attachPageScreenshot(
          testInfo,
          popupPage,
          CONST.TESTING.REPORT_SCREENSHOTS.POPUP_DEFAULT,
        );
        const optionsPagePromise = sharedBrowserContext.waitForEvent("page");
        await clickExtensionControl(
          popupPage,
          popupPage.getByRole("button", {
            name: CONST.TESTING.POPUP.ADDITIONAL_SETTINGS_BUTTON,
          }),
          CONST.TESTING.POPUP.ADDITIONAL_SETTINGS_BUTTON,
        );
        optionsPage = await optionsPagePromise;
        await expect(optionsPage).toHaveURL(
          CONST.TESTING.EXTENSION_PAGES.OPTIONS_URL_PATTERN,
        );
        await expect(
          optionsPage.getByRole("heading", {
            name: CONST.TESTING.POPUP.HEADING,
          }),
        ).toBeVisible();
        await attachPageScreenshot(
          testInfo,
          optionsPage,
          CONST.TESTING.REPORT_SCREENSHOTS.DEVELOPER_SETTINGS,
        );
      } finally {
        if (optionsPage && !optionsPage.isClosed()) await optionsPage.close();
        if (!popupPage.isClosed()) await popupPage.close();
      }
    },
  );
});
