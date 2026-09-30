import { expect, test, type Page } from "../../../fixtures/playwright";
import { getExtensionId, openExtensionPage, setExtensionCheckbox } from "../../../fixtures/extension";
import { openSitecorePageAndFindFoblesFrame, attachScreenshot } from "../../../helpers/fobles-helpers";
import { bringPageToFront } from "../../../helpers/page-switch";
import {
  clickOptionsButton,
  openSettingsSection,
  readStableCheckboxState,
  TESTING,
} from "../options-test-helpers";

test.describe("Extension UI Integration", () => {
  test("developer settings affect Content Editor logging and the popup", async ({
    sharedBrowserContext,
    page,
  }, testInfo) => {
    const extensionId = await getExtensionId(sharedBrowserContext);
    const optionsPage = await openExtensionPage(
      sharedBrowserContext,
      extensionId,
      TESTING.EXTENSION_PAGES.OPTIONS,
    );
    let popupPage: Page | undefined;
    let originalDebugLogging: boolean | undefined;
    let originalReloadButtonSetting: boolean | undefined;
    const debugMessages: string[] = [];
    page.on("console", (message) => {
      if (message.text().includes(TESTING.CONTENT_EDITOR_DEBUG.LOG_MARKER)) {
        debugMessages.push(message.text());
      }
    });

    try {
      await openSettingsSection(optionsPage, TESTING.OPTIONS.DEVELOPER.SECTION_TITLE);
    await page.keyboard.press(TESTING.CONTENT_EDITOR_DEBUG.OPEN_CONSOLE_SHORTCUT);
      const debugLogging = optionsPage.locator(TESTING.OPTIONS.DEVELOPER.DEBUG_LOGGING_SELECTOR);
      const showReloadButton = optionsPage.locator(
        TESTING.OPTIONS.DEVELOPER.RELOAD_BUTTON_SETTING_SELECTOR,
      );
      originalDebugLogging = await readStableCheckboxState(debugLogging);
      originalReloadButtonSetting = await readStableCheckboxState(showReloadButton);

      await setExtensionCheckbox(
        optionsPage,
        debugLogging,
        false,
        TESTING.OPTIONS.DEVELOPER.DEBUG_LOGGING_SELECTOR,
      );
      await setExtensionCheckbox(
        optionsPage,
        showReloadButton,
        !originalReloadButtonSetting,
        TESTING.OPTIONS.DEVELOPER.RELOAD_BUTTON_SETTING_SELECTOR,
      );
      await clickOptionsButton(optionsPage, TESTING.OPTIONS.DEVELOPER.SAVE_BUTTON);
      await expect(optionsPage.locator(TESTING.OPTIONS.DEVELOPER.STATUS_SELECTOR)).toHaveText(
        TESTING.OPTIONS.DEVELOPER.SAVE_STATUS,
      );

      await bringPageToFront(page);
      await openSitecorePageAndFindFoblesFrame(page);
      debugMessages.length = 0;
      await setExtensionCheckbox(
        optionsPage,
        debugLogging,
        true,
        TESTING.OPTIONS.DEVELOPER.DEBUG_LOGGING_SELECTOR,
      );
      await clickOptionsButton(optionsPage, TESTING.OPTIONS.DEVELOPER.SAVE_BUTTON);
      await expect(optionsPage.locator(TESTING.OPTIONS.DEVELOPER.STATUS_SELECTOR)).toHaveText(
        TESTING.OPTIONS.DEVELOPER.SAVE_STATUS,
      );
      await bringPageToFront(page);
      await expect
        .poll(() => debugMessages.some((message) => message.includes(TESTING.CONTENT_EDITOR_DEBUG.LOG_MARKER)))
        .toBe(true);
      await attachScreenshot(
        testInfo,
        page,
        TESTING.REPORT_SCREENSHOTS.DEBUG_LOGGING_ENABLED,
      );

      await setExtensionCheckbox(
        optionsPage,
        debugLogging,
        false,
        TESTING.OPTIONS.DEVELOPER.DEBUG_LOGGING_SELECTOR,
      );
      await clickOptionsButton(optionsPage, TESTING.OPTIONS.DEVELOPER.SAVE_BUTTON);
      await expect(optionsPage.locator(TESTING.OPTIONS.DEVELOPER.STATUS_SELECTOR)).toHaveText(
        TESTING.OPTIONS.DEVELOPER.SAVE_STATUS,
      );
      debugMessages.length = 0;
      await bringPageToFront(page);
      await openSitecorePageAndFindFoblesFrame(page);
      expect(
        debugMessages.some((message) => message.includes(TESTING.CONTENT_EDITOR_DEBUG.LOG_MARKER)),
      ).toBe(false);
      await attachScreenshot(
        testInfo,
        page,
        TESTING.REPORT_SCREENSHOTS.DEBUG_LOGGING_DISABLED,
      );

      await optionsPage.reload();
      await openSettingsSection(optionsPage, TESTING.OPTIONS.DEVELOPER.SECTION_TITLE);
      await expect(
        optionsPage.locator(TESTING.OPTIONS.DEVELOPER.DEBUG_LOGGING_SELECTOR),
      ).toBeChecked({ checked: false });
      await expect(
        optionsPage.locator(TESTING.OPTIONS.DEVELOPER.RELOAD_BUTTON_SETTING_SELECTOR),
      ).toBeChecked({ checked: !originalReloadButtonSetting });

      popupPage = await openExtensionPage(
        sharedBrowserContext,
        extensionId,
        TESTING.EXTENSION_PAGES.POPUP,
      );
      const reloadButton = popupPage.locator(TESTING.POPUP.RELOAD_EXTENSION_BUTTON_SELECTOR);
      if (!originalReloadButtonSetting) await expect(reloadButton).toBeVisible();
      else await expect(reloadButton).toBeHidden();
      await attachScreenshot(
        testInfo,
        popupPage,
        TESTING.REPORT_SCREENSHOTS.DEVELOPER_SETTINGS,
      );
    } finally {
      if (
        !optionsPage.isClosed() &&
        originalDebugLogging !== undefined &&
        originalReloadButtonSetting !== undefined
      ) {
        await openSettingsSection(optionsPage, TESTING.OPTIONS.DEVELOPER.SECTION_TITLE);
        await setExtensionCheckbox(
          optionsPage,
          optionsPage.locator(TESTING.OPTIONS.DEVELOPER.DEBUG_LOGGING_SELECTOR),
          originalDebugLogging,
          TESTING.OPTIONS.DEVELOPER.DEBUG_LOGGING_SELECTOR,
        );
        await setExtensionCheckbox(
          optionsPage,
          optionsPage.locator(TESTING.OPTIONS.DEVELOPER.RELOAD_BUTTON_SETTING_SELECTOR),
          originalReloadButtonSetting,
          TESTING.OPTIONS.DEVELOPER.RELOAD_BUTTON_SETTING_SELECTOR,
        );
        await clickOptionsButton(optionsPage, TESTING.OPTIONS.DEVELOPER.SAVE_BUTTON);
        await expect(optionsPage.locator(TESTING.OPTIONS.DEVELOPER.STATUS_SELECTOR)).toHaveText(
          TESTING.OPTIONS.DEVELOPER.SAVE_STATUS,
        );
      }
      if (popupPage && !popupPage.isClosed()) await popupPage.close();
      if (!optionsPage.isClosed()) await optionsPage.close();
    }
  });
});
