import { expect } from "@playwright/test";
import { clickExtensionControl, getExtensionId, openExtensionPage } from "./extension";
import { TEST_CONST } from "../constants/TEST_CONST";
import type { SettingsProfile } from "./SettingsProfile.types";

// Reuses the options page's own real "Clear all stored settings" button (Storage debug section)
// rather than writing chrome.storage directly - every Fobles setting getter already falls back to
// its own built-in default (true/false/DEFAULT_TOOLBAR_PLACEMENT/etc.) once its key is absent, so
// clearing is equivalent to "every setting at its shipped default" without this file needing to
// know or duplicate any of those individual default values.
export const applyDefaultSettingsProfile: SettingsProfile = async (context) => {
  const extensionId = await getExtensionId(context);
  const optionsPage = await openExtensionPage(context, extensionId, "options");
  try {
    const section = optionsPage
      .locator(TEST_CONST.TESTING.OPTIONS.SECTION_SELECTOR)
      .filter({
        has: optionsPage.locator(TEST_CONST.TESTING.OPTIONS.SUMMARY_SELECTOR, {
          hasText: TEST_CONST.TESTING.OPTIONS.STORAGE.SECTION_TITLE,
        }),
      });
    await expect(section).toHaveCount(1);
    const isOpen = await section.evaluate((element) => (element as HTMLDetailsElement).open);
    if (!isOpen) {
      const summary = section.locator(TEST_CONST.TESTING.OPTIONS.SUMMARY_DIRECT_CHILD_SELECTOR);
      await clickExtensionControl(optionsPage, summary, TEST_CONST.TESTING.OPTIONS.STORAGE.SECTION_TITLE);
    }

    const clearButton = optionsPage.getByRole("button", { name: TEST_CONST.TESTING.OPTIONS.STORAGE.CLEAR_BUTTON });
    const confirmation = optionsPage.waitForEvent("dialog").then((dialog) => dialog.accept());
    await clickExtensionControl(optionsPage, clearButton, TEST_CONST.TESTING.OPTIONS.STORAGE.CLEAR_BUTTON);
    await confirmation;
    await expect(optionsPage.locator(TEST_CONST.TESTING.OPTIONS.STORAGE.CLEAR_STATUS_SELECTOR)).toHaveText(
      TEST_CONST.TESTING.OPTIONS.STORAGE.CLEAR_STATUS,
    );
  } finally {
    await optionsPage.close();
  }
};
