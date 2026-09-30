import { expect, test } from "../../../fixtures/playwright";
import { getExtensionId, openExtensionPage } from "../../../fixtures/extension";
import { CONST } from "../../../CONST";
import {
  openTreeJumpsColumn,
  addTestRow,
  removeTestRowIfPresent,
} from "../../toolbar/support/other-settings-helpers";

test.describe("User Tree Jump Persistence", () => {
  test("Additional Settings adds and normalizes a User Tree Jump", async ({ sharedBrowserContext }) => {
    test.setTimeout(CONST.TESTING.TIMEOUTS.TEST_SUITE_MS);
    const extensionId = await getExtensionId(sharedBrowserContext);
    const optionsPage = await openExtensionPage(
      sharedBrowserContext,
      extensionId,
      CONST.TESTING.EXTENSION_PAGES.OPTIONS,
    );

    try {
      await removeTestRowIfPresent(optionsPage);
      await addTestRow(optionsPage);
      await optionsPage.reload();
      const treeJumpsColumn = await openTreeJumpsColumn(optionsPage);
      const row = treeJumpsColumn.locator(".user-tree-jump-row").last();
      await expect(row.locator("input[name='label']")).toHaveValue(
        CONST.TESTING.ADDITIONAL_SETTINGS.TEST_JUMP.label,
      );
      await expect(row.locator("input[name='pathSuffix']")).toHaveValue(
        CONST.TESTING.ADDITIONAL_SETTINGS.TEST_JUMP.pathSuffixRaw.replace(/^\/+/, ""),
      );
      await expect(row.locator("input[name='icon']")).toHaveValue(
        CONST.TESTING.ADDITIONAL_SETTINGS.TEST_JUMP_ICON_NORMALIZED,
      );
      await expect(row.locator("input[name='enabled']")).toBeChecked();
    } finally {
      await removeTestRowIfPresent(optionsPage);
      await optionsPage.close();
    }
  });
});
