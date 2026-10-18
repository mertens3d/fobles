import { expect, foblesTest } from "../../../fixtures/playwright";
import { getExtensionId, openExtensionPage } from "../../../fixtures/extension";
import { TEST_CONST } from "../../../constants/TEST_CONST";
import {
  openTreeJumpsColumn,
  addTestRow,
  removeTestRowIfPresent,
} from "../../toolbar/support/extension-options-settings-helpers";

foblesTest.describe("User Tree Jump Persistence", () => {
  foblesTest("Additional Settings adds and normalizes a User Tree Jump", async ({ sharedBrowserContext }) => {
    foblesTest.setTimeout(TEST_CONST.TESTING.TIMEOUTS.TEST_SUITE_MS);
    const extensionId = await getExtensionId(sharedBrowserContext);
    const optionsPage = await openExtensionPage(
      sharedBrowserContext,
      extensionId,
      TEST_CONST.TESTING.EXTENSION_PAGES.OPTIONS,
    );

    try {
      await removeTestRowIfPresent(optionsPage);
      await addTestRow(optionsPage);
      await optionsPage.reload();
      const treeJumpsColumn = await openTreeJumpsColumn(optionsPage);
      const row = treeJumpsColumn.locator(".user-tree-jump-row").last();
      await expect(row.locator("input[name='label']")).toHaveValue(
        TEST_CONST.TESTING.ADDITIONAL_SETTINGS.TEST_JUMP.label,
      );
      await expect(row.locator("input[name='pathSuffix']")).toHaveValue(
        TEST_CONST.TESTING.ADDITIONAL_SETTINGS.TEST_JUMP.pathSuffixRaw.replace(/^\/+/, ""),
      );
      await expect(row.locator("input[name='icon']")).toHaveValue(
        TEST_CONST.TESTING.ADDITIONAL_SETTINGS.TEST_JUMP_ICON_NORMALIZED,
      );
      await expect(row.locator("input[name='enabled']")).toBeChecked();
    } finally {
      await removeTestRowIfPresent(optionsPage);
      await optionsPage.close();
    }
  });
});
