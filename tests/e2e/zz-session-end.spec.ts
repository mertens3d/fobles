import { expect, test } from "./fixtures/playwright";
import { getTestEnvironment } from "./fixtures/environment";
import { attachScreenshot } from "./fobles-helpers";
import { logoutCurrentSitecoreSession } from "./fixtures/sitecore";
import { CONST } from "./CONST";

// Filename sorts after "strategies/" and "toolbar/" so this always runs last across the whole
// suite. Logs out itself rather than relying on the worker-teardown cleanup (fixtures/playwright.ts),
// which only runs after every test - including this one - has already finished.
test.describe("Session", () => {
  test("IsLoggedOut", async ({ page }, testInfo) => {
    const { baseUrl } = getTestEnvironment();
    const contentEditorUrl = new URL(CONST.SITECORE.PATHS.CONTENT_EDITOR, baseUrl).toString();

    await page.goto(contentEditorUrl, { waitUntil: "domcontentloaded" });
    const loggedOut = await logoutCurrentSitecoreSession(page);
    expect(loggedOut, 'Expected a visible Sitecore "Log out" link on Content Editor').toBe(true);

    await page.goto(contentEditorUrl, { waitUntil: "domcontentloaded" });
    // Sitecore's own login page container - a more definitive discriminator than checking for a
    // password input in isolation, since it identifies the whole login page context unambiguously.
    const loginPage = page.locator(".login-page").first();
    await expect(loginPage).toBeVisible();
    await attachScreenshot(testInfo, page, "login-page.png", {
      mask: [page.locator("#Username"), page.locator("#Password")],
    });
  });
});
