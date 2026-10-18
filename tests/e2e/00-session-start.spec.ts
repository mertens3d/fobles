import { expect, foblesTest } from "../fixtures/playwright";
import {  openContentEditor } from "../fixtures/sitecore";
import { attachLocatorScreenshot } from "../helpers/fobles-helpers-support/screenshots";
import { TEST_CONST } from "../constants/TEST_CONST";
import { RECORD_VIDEO } from "../settings/settings";

foblesTest.describe("Session", () => {
  foblesTest("IsLoggedIn", async ({ page }, testInfo) => {
    await openContentEditor(page);
    await expect(page.locator("input[type='password']")).toHaveCount(0);

    const accountInfo = page.locator(TEST_CONST.SITECORE.SELECTORS.ACCOUNT_INFO).first();
    await expect(accountInfo).toBeVisible();
    if (!RECORD_VIDEO) {
      await attachLocatorScreenshot(testInfo, accountInfo, "account-info.png");
    }
  });
});
