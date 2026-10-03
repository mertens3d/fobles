import { expect, foblesTest } from "../fixtures/playwright";
import { getTestEnvironment } from "../fixtures/environment";
import { attachPageScreenshot } from "../helpers/fobles-helpers-support/screenshots";
import { logoutCurrentSitecoreSession } from "../fixtures/sitecore";
import { CONST } from "../CONST";
import { RECORD_VIDEO } from "../settings/settings";

// Filename sorts after "strategies/" and "toolbar/" so this always runs last across the whole
// suite. Logs out itself rather than relying on the worker-teardown cleanup (fixtures/playwright.ts),
// which only runs after every test - including this one - has already finished.
foblesTest.describe("Session", () => {
  foblesTest("IsLoggedOut", async ({ page }, testInfo) => {
    const { baseUrl, version } = getTestEnvironment();
    const contentEditorUrl = new URL(CONST.SITECORE.PATHS.CONTENT_EDITOR_BW, baseUrl).toString();

    await page.goto(contentEditorUrl, { waitUntil: "domcontentloaded" });
    const loggedOut = await logoutCurrentSitecoreSession(page);
    expect(loggedOut, 'Expected a visible Sitecore "Log out" link on Content Editor').toBe(true);

    try {
      await page.goto(contentEditorUrl, { waitUntil: "domcontentloaded" });
    } catch {
      // The post-logout redirect chain (Sitecore -> IdentityServer /connect/authorize -> an
      // auto-submitting form_post response -> /Account/Login) can start a further client-side
      // navigation before this goto's own domcontentloaded fires, which Playwright surfaces as
      // net::ERR_ABORTED even though the browser lands on the expected login page regardless -
      // the assertion below checks the actual end state, not this navigation's own promise.
    }
    // Sitecore's own login page container, or - on the "ai" environment - Auth0's hosted
    // Universal Login form it redirects to instead; either one unambiguously identifies the
    // logged-out end state.
    const loginPage = page.locator(
      version === "ai" ? CONST.SITECORE.SELECTORS.AI_LOGIN_FORM : CONST.SITECORE.SELECTORS.LOGIN_PAGE,
    ).first();
    await expect(loginPage).toBeVisible();
    // Skipped during a promoVideo recording session - see 00-session-start.spec.ts's own check.
    if (!RECORD_VIDEO) {
      await attachPageScreenshot(testInfo, page, "login-page.png", {
        mask: [page.locator("#Username"), page.locator("#Password")],
      });
    }
  });
});
