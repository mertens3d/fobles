import { expect, foblesTest } from "../fixtures/playwright";
import {  openContentEditor } from "../fixtures/sitecore";
import { attachScreenshot } from "../helpers/fobles-helpers";
import { CONST } from "../CONST";
import { RECORD_VIDEO } from "../settings/settings";

foblesTest.describe("Session", () => {
  foblesTest("IsLoggedIn", async ({ page }, testInfo) => {
    await openContentEditor(page);
    await expect(page.locator("input[type='password']")).toHaveCount(0);

    const accountInfo = page.locator(CONST.SITECORE.SELECTORS.ACCOUNT_INFO).first();
    await expect(accountInfo).toBeVisible();
    if (!RECORD_VIDEO) {
      await attachScreenshot(testInfo, accountInfo, "account-info.png");
    }
  });
});
