import { expect, type BrowserContext } from "@playwright/test";
import { clickExtensionControl, getExtensionId, openExtensionPage } from "./extension";
import { CONST } from "../CONST";

// A named, swappable starting state for every Fobles setting - applied once per test (see the
// foblesTest.extend auto fixture in playwright.ts) so a test never inherits leftover state from
// whichever test ran before it in this shared persistent profile. New profiles (e.g. a corrupt-data
// one - see docs/TODO.md) are added here as additional functions with this same signature, never
// by changing call sites. Deliberately uses only fixtures/extension.ts (not
// e2e/options-test-helpers.ts, which imports fixtures/playwright.ts) to avoid a circular import,
// since playwright.ts itself needs to call a profile from its own auto fixture.
export type SettingsProfile = (context: BrowserContext) => Promise<void>;

// Reuses the options page's own real "Clear all stored settings" button (Storage debug section)
// rather than writing chrome.storage directly - every Fobles setting getter already falls back to
// its own built-in default (true/false/DEFAULT_TOOLBAR_PLACEMENT/etc.) once its key is absent, so
// clearing is equivalent to "every setting at its shipped default" without this file needing to
// know or duplicate any of those individual default values.
export const applyDefaultSettingsProfile: SettingsProfile = async (context) => {
  const extensionId = await getExtensionId(context);
  const optionsPage = await openExtensionPage(context, extensionId, "options");
  try {
    const section = optionsPage.locator(CONST.TESTING.OPTIONS.SECTION_SELECTOR).filter({
      has: optionsPage.locator(CONST.TESTING.OPTIONS.SUMMARY_SELECTOR, {
        hasText: CONST.TESTING.OPTIONS.STORAGE.SECTION_TITLE,
      }),
    });
    await expect(section).toHaveCount(1);
    const isOpen = await section.evaluate((element) => (element as HTMLDetailsElement).open);
    if (!isOpen) {
      const summary = section.locator(CONST.TESTING.OPTIONS.SUMMARY_DIRECT_CHILD_SELECTOR);
      await clickExtensionControl(optionsPage, summary, CONST.TESTING.OPTIONS.STORAGE.SECTION_TITLE);
    }

    const clearButton = optionsPage.getByRole("button", {
      name: CONST.TESTING.OPTIONS.STORAGE.CLEAR_BUTTON,
    });
    const confirmation = optionsPage.waitForEvent("dialog").then((dialog) => dialog.accept());
    await clickExtensionControl(optionsPage, clearButton, CONST.TESTING.OPTIONS.STORAGE.CLEAR_BUTTON);
    await confirmation;
    await expect(
      optionsPage.locator(CONST.TESTING.OPTIONS.STORAGE.CLEAR_STATUS_SELECTOR),
    ).toHaveText(CONST.TESTING.OPTIONS.STORAGE.CLEAR_STATUS);
  } finally {
    await optionsPage.close();
  }
};
