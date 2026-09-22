import { expect, test } from "./fixtures/playwright";
import { openSitecorePage } from "./fixtures/sitecore";
import { attachScreenshot } from "./fobles-helpers";
import { CONST } from "./CONST";
import { RECORD_VIDEO } from "../settings/VideoSwitch";

// Filename sorts before "strategies/" and "toolbar/" so this always runs first across the whole
// suite - openSitecorePage already pauses for interactive login if needed (fixtures/sitecore.ts).
test.describe("Session", () => {
  test("IsLoggedIn", async ({ page }, testInfo) => {
    await openSitecorePage(page, CONST.SITECORE.PATHS.CONTENT_EDITOR);
    await expect(page.locator("input[type='password']")).toHaveCount(0);

    const accountInfo = page.locator(CONST.SITECORE.SELECTORS.ACCOUNT_INFO).first();
    await expect(accountInfo).toBeVisible();
    // Skipped during a promoVideo recording session - this bookend screenshot isn't part of the
    // recording and would otherwise leave a stray screenshot alongside the finished video.
    if (!RECORD_VIDEO) {
      // attachScreenshot masks the account-info username itself now (fobles-helpers.ts), so no
      // explicit mask is needed here.
      await attachScreenshot(testInfo, accountInfo, "account-info.png");
    }
  });
});
