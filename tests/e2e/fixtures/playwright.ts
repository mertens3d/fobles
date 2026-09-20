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
import { logoutCurrentSitecoreSession } from "./sitecore";
import { CONST } from "../CONST";

const profileDir = path.resolve(
  process.env.PLAYWRIGHT_PROFILE_DIR ??
    "./tests/test-artifacts/browser-profile",
);
const extensionPath = path.resolve("./dist/unpacked");

installConsoleLogging();

// Sitecore's own UI references icons this environment doesn't have (chart.png, database.png,
// cd.png, etc. under /-/icon/) - these 404 on every navigation and are unrelated to Fobles, so
// don't clutter the diagnostic log with them.
const IGNORED_DIAGNOSTIC_URL_PATTERN = /\/-\/icon\//i;

function isIgnorableDiagnosticUrl(url: string): boolean {
  return IGNORED_DIAGNOSTIC_URL_PATTERN.test(url);
}

async function logoutSitecoreSessions(
  context: import("@playwright/test").BrowserContext,
): Promise<void> {
  const page = context.pages()[0];
  if (!page) return;

  try {
    // The last test may have left the browser on an admin subpage (dbbrowser.aspx, cache.aspx,
    // Kick User, etc.) without the shell chrome - Content Editor always has the logout link.
    const { getTestEnvironment } = await import("./environment");
    const { baseUrl } = getTestEnvironment();
    await page.goto(new URL(CONST.SITECORE.PATHS.CONTENT_EDITOR, baseUrl).toString(), {
      waitUntil: "domcontentloaded",
    });
  } catch {
    // Navigation may fail if the session already expired - fall through to the search below.
  }

  for (const page of context.pages()) {
    if (await logoutCurrentSitecoreSession(page)) {
      logDiagnostic(`[test cleanup] Logging out Sitecore session from ${page.url()}`);
      return;
    }
  }
}

type WorkerFixtures = {
  sharedBrowserContext: BrowserContext;
  sharedPage: import("@playwright/test").Page;
};

export const test = base.extend<{}, WorkerFixtures>({
  sharedBrowserContext: [
    async ({}, use) => {
      const context = await chromium.launchPersistentContext(profileDir, {
        headless: false,
        // Without an explicit viewport, a persistent context defaults to the real OS window size
        // - on a wide monitor that stretches Sitecore's own percentage-width panels (editor
        // sections, Quick Info, etc.), making every screenshot unnecessarily wide. 1280 (Playwright's
        // own standard "Desktop Chrome" default) still left them wider than needed, so use 800.
        viewport: { width: 800, height: 720 },
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
          if (location && isIgnorableDiagnosticUrl(location)) return;
          const label = `[browser console:${message.type()}]`;
          logDiagnostic(
            `${label} ${message.text()}${location ? ` (${location})` : ""}`,
          );
        });
        page.on("response", (response) => {
          if (response.status() >= 400 && !isIgnorableDiagnosticUrl(response.url())) {
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
        // Catches silent redirects (e.g. an IdentityServer renewal) the instant they happen,
        // regardless of which test step is running when it occurs.
        page.on("framenavigated", (frame) => {
          const kind = frame === page.mainFrame() ? "main frame" : "iframe";
          logDiagnostic(`[browser framenavigated:${kind}] ${frame.url()}`);
        });
        page.on("crash", () => {
          logDiagnostic(`[browser crash] page render process crashed at ${page.url()}`);
        });
      };

      context.pages().forEach(attachPageDiagnostics);
      context.on("page", attachPageDiagnostics);
      await use(context);
      await new Promise((resolve) => setTimeout(resolve, 10_000));
      await logoutSitecoreSessions(context);
      await context.close();
    },
    { scope: "worker" },
  ],
  // Worker-scoped so the SAME page/tab is reused for every test in this worker - a test-scoped
  // page fixture would create a brand-new page (and closes it after each test, since
  // sharedBrowserContext.pages()[0] is undefined right after that close), which meant every test
  // opened a fresh Sitecore session - and consumed a fresh license slot - instead of reusing one.
  sharedPage: [
    async ({ sharedBrowserContext }, use) => {
      const page = sharedBrowserContext.pages()[0] ?? (await sharedBrowserContext.newPage());
      await use(page);
    },
    { scope: "worker" },
  ],
  page: async ({ sharedPage }, use) => {
    await use(sharedPage);
  },
});

export { expect } from "@playwright/test";
export type { Frame, Locator, Page } from "@playwright/test";
