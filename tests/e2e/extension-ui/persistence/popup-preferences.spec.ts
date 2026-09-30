import { expect, foblesTest, type Locator } from "../../../fixtures/playwright";
import { clickExtensionControl, getExtensionId, openExtensionPage, setExtensionCheckbox } from "../../../fixtures/extension";
import { attachScreenshot } from "../../../helpers/fobles-helpers";
import { CONST } from "../../../CONST";

async function readStableCheckboxState(checkbox: Locator): Promise<boolean> {
  let previousState: boolean | undefined;
  let stableReads = 0;

  await expect
    .poll(
      async () => {
        const currentState = await checkbox.isChecked();
        stableReads = currentState === previousState ? stableReads + 1 : 0;
        previousState = currentState;
        return stableReads >= 2;
      },
      { intervals: [100, 200, 300] },
    )
    .toBe(true);

  return previousState ?? false;
}

foblesTest.describe("Popup Preference Persistence", () => {
  foblesTest("shows and persists the navigation preferences", async ({ sharedBrowserContext }, testInfo) => {
    const extensionId = await getExtensionId(sharedBrowserContext);
    const popupPage = await openExtensionPage(
      sharedBrowserContext,
      extensionId,
      CONST.TESTING.EXTENSION_PAGES.POPUP,
    );
    const originalStates = new Map<string, boolean>();

    try {
      await attachScreenshot(testInfo, popupPage, CONST.TESTING.REPORT_SCREENSHOTS.POPUP_DEFAULT);
      for (const id of CONST.TESTING.POPUP.PREFERENCE_IDS) {
        const checkbox = popupPage.locator(
          `${CONST.TESTING.POPUP.PREFERENCE_SELECTOR_PREFIX}${id}`,
        );
        await expect(checkbox).toBeVisible();
        originalStates.set(id, await readStableCheckboxState(checkbox));
        await clickExtensionControl(popupPage, checkbox, id);
        await expect(checkbox).toBeChecked({ checked: !originalStates.get(id) });
      }

      await popupPage.reload();
      for (const id of CONST.TESTING.POPUP.PREFERENCE_IDS) {
        await expect(
          popupPage.locator(`${CONST.TESTING.POPUP.PREFERENCE_SELECTOR_PREFIX}${id}`),
        ).toBeChecked({ checked: !originalStates.get(id) });
      }
      await attachScreenshot(
        testInfo,
        popupPage,
        CONST.TESTING.REPORT_SCREENSHOTS.POPUP_PREFERENCES_SAVED,
      );
    } finally {
      for (const id of CONST.TESTING.POPUP.PREFERENCE_IDS) {
        const originalState = originalStates.get(id);
        if (originalState === undefined || popupPage.isClosed()) continue;
        await setExtensionCheckbox(
          popupPage,
          popupPage.locator(`${CONST.TESTING.POPUP.PREFERENCE_SELECTOR_PREFIX}${id}`),
          originalState,
          id,
        );
      }
      if (
        !popupPage.isClosed() &&
        originalStates.size === CONST.TESTING.POPUP.PREFERENCE_IDS.length
      ) {
        await popupPage.reload();
        for (const id of CONST.TESTING.POPUP.PREFERENCE_IDS) {
          await expect(
            popupPage.locator(`${CONST.TESTING.POPUP.PREFERENCE_SELECTOR_PREFIX}${id}`),
          ).toBeChecked({ checked: originalStates.get(id) });
        }
      }
      if (!popupPage.isClosed()) await popupPage.close();
    }
  });
});
