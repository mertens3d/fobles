import { expect, foblesTest } from "../../../fixtures/playwright";
import {
  clickExtensionControl,
  getExtensionId,
  openExtensionPage,
  setExtensionCheckbox,
} from "../../../fixtures/extension";
import { CONST } from "../../../CONST";
import { clickWithMouseMarker } from "../../../helpers/mouse-proxy";
import { openContentEditor } from "../../../fixtures/sitecore";
import { findFoblesFrame } from "../../../helpers/frame-finder";
import { ClickFoblesJumpButton } from "../../../macros/fobles-macros";
import { attachLocatorScreenshot } from "../../../helpers/fobles-helpers-support/screenshots";
import { bringPageToFront } from "../../../helpers/page-switch";
import {
  clickOptionsButton,
  fillOptionsInput,
  findAdminPageByLabel,
  openAdminPagesColumn,
  TESTING,
} from "../options-test-helpers";

foblesTest.describe("User Admin Pages Toolbar Integration", () => {
  foblesTest("updates the toolbar live when a User Admin Page is enabled or disabled", async ({
    sharedBrowserContext,
    page,
  }, testInfo) => {
    foblesTest.setTimeout(CONST.TESTING.TIMEOUTS.TEST_SUITE_MS);
    const extensionId = await getExtensionId(sharedBrowserContext);
    const optionsPage = await openExtensionPage(
      sharedBrowserContext,
      extensionId,
      TESTING.EXTENSION_PAGES.OPTIONS,
    );
    const label = `${TESTING.ADDITIONAL_SETTINGS.ADMIN_PAGE.INTEGRATION_LABEL_PREFIX}${Date.now()}`;
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
        TESTING.ADDITIONAL_SETTINGS.ADMIN_PAGE.INTEGRATION_URL,
      );
      await clickOptionsButton(optionsPage, TESTING.OPTIONS.ADMIN_PAGES.SAVE_BUTTON);
      await expect(optionsPage.locator(TESTING.OPTIONS.ADMIN_PAGES.STATUS_SELECTOR)).toHaveText(
        TESTING.OPTIONS.ADMIN_PAGES.SAVE_STATUS,
      );

      await bringPageToFront(page);
      await openContentEditor(page, CONST.SITECORE.DOM.TREE_NODE_IDS.CONTENT);
      const foblesFrame = await findFoblesFrame(page);
      await ClickFoblesJumpButton(page);
      await expect(foblesFrame.getByRole("button", { name: label, exact: true })).toBeVisible();
      await expect(foblesFrame.getByText(TESTING.JUMP_MENU.ADMIN_PAGES_GROUP_LABEL)).toBeVisible();
      await attachLocatorScreenshot(
        testInfo,
        foblesFrame.locator(CONST.FOBLES.SELECTORS.JUMP_MENU_FLYOUT),
        TESTING.REPORT_SCREENSHOTS.ADMIN_PAGE_ENABLED,
      );

      await setExtensionCheckbox(
        optionsPage,
        newRow.locator(TESTING.JUMP_MENU.USER_ADMIN_PAGE_ENABLED_INPUT),
        false,
        label,
      );
      await clickOptionsButton(optionsPage, TESTING.OPTIONS.ADMIN_PAGES.SAVE_BUTTON);
      await expect(optionsPage.locator(TESTING.OPTIONS.ADMIN_PAGES.STATUS_SELECTOR)).toHaveText(
        TESTING.OPTIONS.ADMIN_PAGES.SAVE_STATUS,
      );
      await expect(foblesFrame.getByRole("button", { name: label, exact: true })).toHaveCount(0);
      await expect(foblesFrame.getByText(TESTING.JUMP_MENU.ADMIN_PAGES_GROUP_LABEL)).toHaveCount(0);
      await attachLocatorScreenshot(
        testInfo,
        foblesFrame.locator(CONST.FOBLES.SELECTORS.JUMP_MENU_FLYOUT),
        TESTING.REPORT_SCREENSHOTS.ADMIN_PAGE_DISABLED,
      );

      await setExtensionCheckbox(
        optionsPage,
        newRow.locator(TESTING.JUMP_MENU.USER_ADMIN_PAGE_ENABLED_INPUT),
        true,
        label,
      );
      await clickOptionsButton(optionsPage, TESTING.OPTIONS.ADMIN_PAGES.SAVE_BUTTON);
      await expect(optionsPage.locator(TESTING.OPTIONS.ADMIN_PAGES.STATUS_SELECTOR)).toHaveText(
        TESTING.OPTIONS.ADMIN_PAGES.SAVE_STATUS,
      );
      const adminPageButton = foblesFrame.getByRole("button", { name: label, exact: true });
      await expect(adminPageButton).toBeVisible();

      const targetUrl = new URL(TESTING.ADDITIONAL_SETTINGS.ADMIN_PAGE.INTEGRATION_URL, page.url());
      await bringPageToFront(page);
      await Promise.all([
        page.waitForURL((url) => url.pathname === targetUrl.pathname),
        clickWithMouseMarker(page, adminPageButton, label),
      ]);
      expect(new URL(page.url()).pathname).toBe(targetUrl.pathname);
    } finally {
      if (rowAdded && !optionsPage.isClosed()) {
        await openAdminPagesColumn(optionsPage);
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
      }
      if (!optionsPage.isClosed()) await optionsPage.close();
    }
  });
});
