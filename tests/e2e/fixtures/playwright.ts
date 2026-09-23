import {
  chromium,
  type BrowserContext,
  type Frame,
  type Locator,
  type Page,
  test as base,
} from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { installConsoleLogging, logDiagnostic } from "./logging";
import { logoutCurrentSitecoreSession } from "./sitecore";
import { CONST } from "../CONST";
import { RECORD_VIDEO } from "../../settings/VideoSwitch";

const profileDir = path.resolve(
  process.env.PLAYWRIGHT_PROFILE_DIR ??
    "./tests/test-artifacts/browser-profile",
);
const extensionPath = path.resolve("./dist/unpacked");

// launchPersistentContext (below) bypasses Playwright's own context/page fixtures entirely, so
// playwright.config.ts's `use.video` setting is never actually consulted - recordVideo has to be
// requested here directly instead. A separate fixtures module per suite and every dynamic-gating
// attempt (process.argv, a process.env mutation at playwright.config.ts's own load time, a marker
// file, a Playwright "option fixture") all turned out to be more trouble than they were worth here
// - flip the RECORD_VIDEO constant in tests/settings/VideoSwitch.ts by hand instead when you
// actually want a recording, and flip it back to false afterward. Every other suite shares this same one
// persistent context/session for its whole run, so a video would cover the entire run, not one
// clip per test - only turn this on for a deliberate promoVideo recording session.
const promoVideoDir = path.resolve("./tests/test-artifacts/playwright-results/promo-video");
// The wider 1100 reads better in a recorded promo video; regular suites stay narrower (see the
// launchPersistentContext call below) so Sitecore's percentage-width panels don't stretch.
const VIEWPORT_SIZE = RECORD_VIDEO ? { width: 1100, height: 720 } : { width: 800, height: 720 };

// See tests/README.md's Promo Video section for why this renames files and how it orders them.
function renamePromoVideoFiles(): void {
  const files = fs
    .readdirSync(promoVideoDir)
    .filter((name) => name.endsWith(".webm"))
    .map((name) => {
      const fullPath = path.join(promoVideoDir, name);
      return { fullPath, sizeBytes: fs.statSync(fullPath).size };
    })
    .sort((a, b) => a.sizeBytes - b.sizeBytes);

  files.forEach((file, index) => {
    const isMainVideo = index === files.length - 1;
    const newName = isMainVideo ? "main.webm" : `secondary-${index + 1}.webm`;
    fs.renameSync(file.fullPath, path.join(promoVideoDir, newName));
  });
}

// Sitecore's own UI references icons this environment doesn't have (chart.png, database.png,
// cd.png, etc. under /-/icon/) - these 404 on every navigation and are unrelated to Fobles, so
// don't clutter the diagnostic log with them.
const IGNORED_DIAGNOSTIC_URL_PATTERN = /\/-\/icon\//i;

function isIgnorableDiagnosticUrl(url: string): boolean {
  return IGNORED_DIAGNOSTIC_URL_PATTERN.test(url);
}

// Chromium logs this on every Sitecore iframe navigation regardless of Fobles - always the same
// text, never actionable, and floods the log enough to bury real warnings.
const IGNORED_CONSOLE_WARNING_PATTERN = /has both allow-scripts and allow-same-origin/i;

function isIgnorableConsoleMessage(type: string, text: string): boolean {
  return type === "warning" && IGNORED_CONSOLE_WARNING_PATTERN.test(text);
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
      // Installed here (not at module load) since this module gets imported for test discovery
      // and listing too, which would otherwise wipe the real log right after an actual run.
      installConsoleLogging();
      if (RECORD_VIDEO) {
        fs.rmSync(promoVideoDir, { recursive: true, force: true });
        fs.mkdirSync(promoVideoDir, { recursive: true });
      }
      const context = await chromium.launchPersistentContext(profileDir, {
        headless: false,
        // Without an explicit viewport, a persistent context defaults to the real OS window size
        // - on a wide monitor that stretches Sitecore's own percentage-width panels (editor
        // sections, Quick Info, etc.), making every screenshot unnecessarily wide. 1280 (Playwright's
        // own standard "Desktop Chrome" default) still left them wider than needed, so use 800 -
        // except for a promoVideo recording, where the wider, more standard 1280 reads better.
        viewport: VIEWPORT_SIZE,
        ...(RECORD_VIDEO ? { recordVideo: { dir: promoVideoDir, size: VIEWPORT_SIZE } } : {}),
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
          if (isIgnorableConsoleMessage(message.type(), message.text())) return;
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
          // logDiagnostic(`[browser framenavigated:${kind}] ${frame.url()}`);
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
      if (RECORD_VIDEO) renamePromoVideoFiles();
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
export type { Frame, Locator, Page, TestInfo } from "@playwright/test";
