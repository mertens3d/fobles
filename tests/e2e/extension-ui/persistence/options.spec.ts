import { expect, foblesTest } from "../../../fixtures/playwright";
import { clickExtensionControl, getExtensionId, openExtensionPage } from "../../../fixtures/extension";
import {  attachPageScreenshot } from "../../../helpers/fobles-helpers";
import { CONST } from "../../../CONST";
import {
  clickOptionsButton,
  fillOptionsInput,
  findAdminPageByLabel,
  findGroupByName,
  openAdminPagesColumn,
  openSettingsSection,
  type StoredSettingsSnapshot,
  TESTING,
} from "../options-test-helpers";

foblesTest.describe("Additional Settings Persistence", () => {
  foblesTest("clears all stored settings", async ({ sharedBrowserContext }, testInfo) => {
    const extensionId = await getExtensionId(sharedBrowserContext);
    const optionsPage = await openExtensionPage(
      sharedBrowserContext,
      extensionId,
      TESTING.EXTENSION_PAGES.OPTIONS,
    );
    let originalSnapshot: StoredSettingsSnapshot | undefined;

    try {
      await openSettingsSection(optionsPage, TESTING.OPTIONS.STORAGE.SECTION_TITLE);
      const storedSettingsOutput = optionsPage.locator(TESTING.OPTIONS.STORAGE.OUTPUT_SELECTOR);
      await clickOptionsButton(optionsPage, TESTING.OPTIONS.STORAGE.VIEW_BUTTON);
      await expect(storedSettingsOutput).toBeVisible();
      originalSnapshot = JSON.parse((await storedSettingsOutput.textContent()) ?? "{}") as StoredSettingsSnapshot;
      await attachPageScreenshot(testInfo, optionsPage, TESTING.REPORT_SCREENSHOTS.STORAGE_BEFORE_CLEAR);

      const confirmation = optionsPage.waitForEvent("dialog").then(async (dialog) => {
        expect(dialog.type()).toBe("confirm");
        await dialog.accept();
      });
      await clickOptionsButton(optionsPage, TESTING.OPTIONS.STORAGE.CLEAR_BUTTON);
      await confirmation;
      await expect(
        optionsPage.locator(TESTING.OPTIONS.STORAGE.CLEAR_STATUS_SELECTOR),
      ).toHaveText(TESTING.OPTIONS.STORAGE.CLEAR_STATUS);

      await clickOptionsButton(optionsPage, TESTING.OPTIONS.STORAGE.VIEW_BUTTON);
      await expect(storedSettingsOutput).toBeVisible();
      const clearedSnapshot = JSON.parse(
        (await storedSettingsOutput.textContent()) ?? "{}",
      ) as StoredSettingsSnapshot;
      expect(clearedSnapshot).toEqual({ sync: {}, local: {} });
      await attachPageScreenshot(testInfo, optionsPage, TESTING.REPORT_SCREENSHOTS.STORAGE_CLEARED);
    } finally {
      if (originalSnapshot && !optionsPage.isClosed()) {
        await optionsPage.evaluate(async (snapshot) => {
          const extensionApi = (
            globalThis as typeof globalThis & {
              chrome: {
                storage: {
                  local: { set: (values: Record<string, unknown>) => Promise<void> };
                  sync: { set: (values: Record<string, unknown>) => Promise<void> };
                };
              };
            }
          ).chrome;
          await Promise.all([
            extensionApi.storage.sync.set(snapshot.sync),
            extensionApi.storage.local.set(snapshot.local),
          ]);
        }, originalSnapshot);
      }
      if (!optionsPage.isClosed()) await optionsPage.close();
    }
  });

  foblesTest("validates, saves, and reloads AI Pages mappings", async ({ sharedBrowserContext }, testInfo) => {
    const extensionId = await getExtensionId(sharedBrowserContext);
    const optionsPage = await openExtensionPage(
      sharedBrowserContext,
      extensionId,
      TESTING.EXTENSION_PAGES.OPTIONS,
    );
    const groupName = `${TESTING.ADDITIONAL_SETTINGS.AI_PAGES.GROUP_NAME_PREFIX}${Date.now()}`;
    let groupAdded = false;

    try {
      await openSettingsSection(optionsPage, TESTING.OPTIONS.AI_PAGES.SECTION_TITLE);
      await clickOptionsButton(optionsPage, TESTING.OPTIONS.AI_PAGES.ADD_GROUP_BUTTON);
      groupAdded = true;
      const newGroup = optionsPage.locator(TESTING.OPTIONS.AI_PAGES.GROUP_SELECTOR).last();
      await expect(newGroup.locator(CONST.TESTING.SELECTORS.AI_MAPPING_NAME_INPUT)).toBeVisible();

      await clickOptionsButton(optionsPage, TESTING.OPTIONS.AI_PAGES.SAVE_MAPPINGS_BUTTON);
      await expect(optionsPage.locator(TESTING.OPTIONS.AI_PAGES.STATUS_SELECTOR)).toHaveText(
        TESTING.OPTIONS.AI_PAGES.COMPLETE_FIELDS_STATUS,
      );
      await expect(newGroup.locator(TESTING.OPTIONS.AI_PAGES.VALIDATION_ERROR_SELECTOR)).toHaveCount(5);

      await fillOptionsInput(
        optionsPage,
        newGroup.locator(CONST.TESTING.SELECTORS.AI_MAPPING_NAME_INPUT),
        groupName,
      );
      await fillOptionsInput(
        optionsPage,
        newGroup.locator(CONST.TESTING.SELECTORS.AI_MAPPING_ORGANIZATION_INPUT),
        TESTING.ADDITIONAL_SETTINGS.AI_PAGES.ORGANIZATION,
      );
      await fillOptionsInput(
        optionsPage,
        newGroup.locator(CONST.TESTING.SELECTORS.AI_MAPPING_TENANT_NAME_INPUT),
        TESTING.ADDITIONAL_SETTINGS.AI_PAGES.TENANT_NAME,
      );
      await fillOptionsInput(
        optionsPage,
        newGroup.locator(CONST.TESTING.SELECTORS.AI_MAPPING_CONTENT_ROOT_INPUT),
        TESTING.ADDITIONAL_SETTINGS.AI_PAGES.CONTENT_ROOT,
      );
      await fillOptionsInput(
        optionsPage,
        newGroup.locator(CONST.TESTING.SELECTORS.AI_MAPPING_SITE_INPUT),
        TESTING.ADDITIONAL_SETTINGS.AI_PAGES.SITE,
      );
      await clickOptionsButton(optionsPage, TESTING.OPTIONS.AI_PAGES.SAVE_MAPPINGS_BUTTON);
      await expect(optionsPage.locator(TESTING.OPTIONS.AI_PAGES.STATUS_SELECTOR)).toHaveText(
        TESTING.OPTIONS.AI_PAGES.MAPPINGS_SAVED_STATUS,
      );

      await optionsPage.reload();
      await openSettingsSection(optionsPage, TESTING.OPTIONS.AI_PAGES.SECTION_TITLE);
      const savedGroup = await findGroupByName(optionsPage, groupName);
      expect(savedGroup).not.toBeNull();
      await expect(savedGroup!.locator(CONST.TESTING.SELECTORS.AI_MAPPING_ORGANIZATION_INPUT)).toHaveValue(
        TESTING.ADDITIONAL_SETTINGS.AI_PAGES.ORGANIZATION,
      );
      await expect(savedGroup!.locator(CONST.TESTING.SELECTORS.AI_MAPPING_TENANT_NAME_INPUT)).toHaveValue(
        TESTING.ADDITIONAL_SETTINGS.AI_PAGES.TENANT_NAME,
      );
      await expect(savedGroup!.locator(CONST.TESTING.SELECTORS.AI_MAPPING_CONTENT_ROOT_INPUT)).toHaveValue(
        TESTING.ADDITIONAL_SETTINGS.AI_PAGES.NORMALIZED_CONTENT_ROOT,
      );
      await expect(savedGroup!.locator(CONST.TESTING.SELECTORS.AI_MAPPING_SITE_INPUT)).toHaveValue(
        TESTING.ADDITIONAL_SETTINGS.AI_PAGES.SITE,
      );
      await attachPageScreenshot(testInfo, optionsPage, TESTING.REPORT_SCREENSHOTS.AI_MAPPINGS_SAVED);
    } finally {
      if (groupAdded && !optionsPage.isClosed()) {
        await openSettingsSection(optionsPage, TESTING.OPTIONS.AI_PAGES.SECTION_TITLE);
        const addedGroup = await findGroupByName(optionsPage, groupName);
        if (addedGroup) {
          await clickExtensionControl(
            optionsPage,
            addedGroup.getByRole("button", { name: TESTING.OPTIONS.AI_PAGES.REMOVE_GROUP_BUTTON }),
            TESTING.OPTIONS.AI_PAGES.REMOVE_GROUP_BUTTON,
          );
          await clickOptionsButton(optionsPage, TESTING.OPTIONS.AI_PAGES.SAVE_MAPPINGS_BUTTON);
          await expect(optionsPage.locator(TESTING.OPTIONS.AI_PAGES.STATUS_SELECTOR)).toHaveText(
            TESTING.OPTIONS.AI_PAGES.MAPPINGS_SAVED_STATUS,
          );
        }
      }
      if (!optionsPage.isClosed()) await optionsPage.close();
    }
  });

  foblesTest("normalizes and persists a User Admin Page", async ({ sharedBrowserContext }, testInfo) => {
    const extensionId = await getExtensionId(sharedBrowserContext);
    const optionsPage = await openExtensionPage(
      sharedBrowserContext,
      extensionId,
      TESTING.EXTENSION_PAGES.OPTIONS,
    );
    const label = `${TESTING.ADDITIONAL_SETTINGS.ADMIN_PAGE.LABEL_PREFIX}${Date.now()}`;
    let rowAdded = false;

    try {
      const adminPagesColumn = await openAdminPagesColumn(optionsPage);
      await clickOptionsButton(optionsPage, TESTING.OPTIONS.ADMIN_PAGES.ADD_BUTTON);
      rowAdded = true;
      const newRow = adminPagesColumn.locator(TESTING.OPTIONS.ADMIN_PAGES.ROW_SELECTOR).last();
      await fillOptionsInput(optionsPage, newRow.locator(TESTING.OPTIONS.ADMIN_PAGES.LABEL_INPUT), label);
      await fillOptionsInput(
        optionsPage,
        newRow.locator(TESTING.OPTIONS.ADMIN_PAGES.URL_INPUT),
        TESTING.ADDITIONAL_SETTINGS.ADMIN_PAGE.URL,
      );
      await fillOptionsInput(
        optionsPage,
        newRow.locator(TESTING.OPTIONS.ADMIN_PAGES.ICON_INPUT),
        TESTING.ADDITIONAL_SETTINGS.ADMIN_PAGE.ICON,
      );
      await clickOptionsButton(optionsPage, TESTING.OPTIONS.ADMIN_PAGES.SAVE_BUTTON);
      await expect(optionsPage.locator(TESTING.OPTIONS.ADMIN_PAGES.STATUS_SELECTOR)).toHaveText(
        TESTING.OPTIONS.ADMIN_PAGES.SAVE_STATUS,
      );

      await optionsPage.reload();
      const savedColumn = await openAdminPagesColumn(optionsPage);
      const savedRow = await findAdminPageByLabel(optionsPage, label);
      expect(savedRow).not.toBeNull();
      await expect(savedRow!.locator(TESTING.OPTIONS.ADMIN_PAGES.URL_INPUT)).toHaveValue(
        TESTING.ADDITIONAL_SETTINGS.ADMIN_PAGE.NORMALIZED_URL,
      );
      await expect(savedRow!.locator(TESTING.OPTIONS.ADMIN_PAGES.ICON_INPUT)).toHaveValue(
        TESTING.ADDITIONAL_SETTINGS.ADMIN_PAGE.NORMALIZED_ICON,
      );
      await expect(savedRow!.locator(TESTING.JUMP_MENU.USER_ADMIN_PAGE_ENABLED_INPUT)).toBeChecked();
      await expect(savedColumn).toBeVisible();
      await attachPageScreenshot(testInfo, optionsPage, TESTING.REPORT_SCREENSHOTS.USER_ADMIN_PAGE_SAVED);
    } finally {
      if (rowAdded && !optionsPage.isClosed()) {
        const adminPagesColumn = await openAdminPagesColumn(optionsPage);
        const addedRow = await findAdminPageByLabel(optionsPage, label);
        if (addedRow) {
          await clickExtensionControl(
            optionsPage,
            addedRow.getByTitle(TESTING.OPTIONS.ADMIN_PAGES.REMOVE_BUTTON_TITLE),
            TESTING.OPTIONS.ADMIN_PAGES.REMOVE_BUTTON_TITLE,
          );
          await clickOptionsButton(optionsPage, TESTING.OPTIONS.ADMIN_PAGES.SAVE_BUTTON);
          await expect(optionsPage.locator(TESTING.OPTIONS.ADMIN_PAGES.STATUS_SELECTOR)).toHaveText(
            TESTING.OPTIONS.ADMIN_PAGES.SAVE_STATUS,
          );
        }
        await expect(adminPagesColumn).toBeVisible();
      }
      if (!optionsPage.isClosed()) await optionsPage.close();
    }
  });
});
