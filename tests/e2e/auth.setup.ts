import { test as setup } from "./fixtures/playwright";
import { getTestEnvironment } from "./fixtures/environment";

setup("manual auth note", async ({ page }) => {
  const { loginUrl } = getTestEnvironment();

  console.warn(
    [
      "Using a persistent Chrome profile for local authentication.",
      "Log in to Sitecore once in the browser profile, then keep using that same browser.",
      `Target login URL: ${loginUrl}`,
    ].join("\n"),
  );

  await page.goto(loginUrl, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle");
});
