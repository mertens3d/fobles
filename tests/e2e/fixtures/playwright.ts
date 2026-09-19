import {
  chromium,
  type BrowserContext,
  type Frame,
  type Locator,
  type Page,
  test as base,
} from "@playwright/test";
import path from "node:path";
import { installConsoleLogging, logDiagnostic } from "./logging";

const profileDir = path.resolve(
  process.env.PLAYWRIGHT_PROFILE_DIR ??
    "./tests/test-artifacts/browser-profile",
);
const extensionPath = path.resolve("./dist/unpacked");

installConsoleLogging();

async function logoutSitecoreSessions(
  context: import("@playwright/test").BrowserContext,
): Promise<void> {
  for (const page of context.pages()) {
    for (const frame of page.frames()) {
      try {
        const logout = frame.getByRole("link", { name: /log\s*out/i }).first();
        if (await logout.isVisible()) {
          logDiagnostic(
            `[test cleanup] Logging out Sitecore session from ${page.url()}`,
          );
          await logout.click();
          return;
        }
      } catch {
        // The page or frame may already be closing after a failed test.
      }
    }
  }
}

type ExtendedFixtures = {
  browserContext: BrowserContext;
};

export const test = base.extend<ExtendedFixtures>({
  browserContext: [
    async ({}, use) => {
      const context = await chromium.launchPersistentContext(profileDir, {
        headless: false,
        args: [
          `--disable-extensions-except=${extensionPath}`,
          `--load-extension=${extensionPath}`,
        ],
      });
      const attachPageDiagnostics = (
        page: import("@playwright/test").Page,
      ): void => {
        page.on("console", (message) => {
          const location = message.location().url;
          const label = `[browser console:${message.type()}]`;
          logDiagnostic(
            `${label} ${message.text()}${location ? ` (${location})` : ""}`,
          );
        });
        page.on("response", (response) => {
          if (response.status() >= 400) {
            logDiagnostic(
              `[browser response:${response.status()}] ${response.request().method()} ${response.url()}`,
            );
          }
        });
        page.on("pageerror", (error) => {
          logDiagnostic(`[browser pageerror] ${error.stack ?? error.message}`);
        });
        page.on("requestfailed", (request) => {
          logDiagnostic(
            `[browser requestfailed] ${request.method()} ${request.url()} - ${request.failure()?.errorText ?? "unknown error"}`,
          );
        });
      };

      context.pages().forEach(attachPageDiagnostics);
      context.on("page", attachPageDiagnostics);
      await use(context);
      await new Promise((resolve) => setTimeout(resolve, 10_000));
      await logoutSitecoreSessions(context);
      await context.close();
    },
    { scope: "test" },
  ],
  page: async ({ browserContext }, use) => {
    const existingPage = browserContext.pages()[0];
    const page = existingPage ?? (await browserContext.newPage());
    await use(page);
    if (!existingPage) {
      await page.close();
    }
  },
});

export { expect } from "@playwright/test";
export type { Frame, Locator, Page } from "@playwright/test";
