// @source-path [fobles] tests/fixtures/playwright.ts

import { chromium, type BrowserContext, test as base, type Request } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { installConsoleLogging, logDiagnostic } from "./playwright-logging";
import { logoutCurrentSitecoreSession } from "./sitecore";
import { TEST_CONST } from "../constants/TEST_CONST";
import { RECORD_VIDEO } from "../settings/settings";
import { logTestDividerStart } from "../helpers/logging-helpers";
import { applyDefaultSettingsProfile } from "./settings-profiles";
import { EnableFoblesDeveloperLogging, GetFoblesPersistedLogs } from "../macros/fobles-macros";
import { createBrowserProfile } from "./browser-profile";
import { restoreWindowPosition, saveWindowPosition } from "./browser-location";

const extensionPath = path.resolve("./dist/unpacked");

// This fixture launches its own context, so playwright.config.ts's use.video
// setting is not consulted. RECORD_VIDEO controls recording here directly.
// The context is shared for the worker's entire run.
const promoVideoDir = path.resolve("./playwright/test-artifacts/playwright-results/promo-video");

const VIEWPORT_SIZE = RECORD_VIDEO ? { width: 1100, height: 720 } : { width: 800, height: 720 };

// See tests/README.md's Promo Video section for naming and ordering.
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

// Ignore missing Sitecore icons unrelated to Fobles.
function isIgnorableDiagnosticUrl(url: string): boolean {
  return TEST_CONST.TESTING.DIAGNOSTIC.IGNORED_DIAGNOSTIC_URL_PATTERN.test(url);
}

// Ignore the known Chromium warning repeated on Sitecore iframe navigation.
function isIgnorableConsoleWarning(text: string): boolean {
  return TEST_CONST.TESTING.DIAGNOSTIC.IGNORED_CONSOLE_WARNING_PATTERN.test(text);
}

function isIgnorableConsoleError(text: string): boolean {
  let isIgnoreable = false;

  if (TEST_CONST.TESTING.DIAGNOSTIC.IGNORABLE_CONSOLE_MESSAGES.some((msg) => text.includes(msg))) {
    isIgnoreable = true;
  }

  return isIgnoreable;
}

function isIgnorableRequestFailure(request: Request): boolean {
  const errorText = request.failure()?.errorText ?? "";
  let isIgnorable = false;

  if (!TEST_CONST.TESTING.DIAGNOSTIC.IGNORED_REQUEST_FAILURES.some((ignored) => errorText.includes(ignored))) {
    isIgnorable = true;
  }

  return isIgnorable;
}

async function logoutSitecoreSessions(context: BrowserContext): Promise<void> {
  const page = context.pages()[0];
  if (!page) return;

  try {
    // The last test may have left the browser on an admin subpage without
    // shell chrome. Content Editor provides the logout link.
    const { getTestEnvironment } = await import("./environment");
    const { baseUrl } = getTestEnvironment();

    await page.goto(new URL(TEST_CONST.SITECORE.PATHS.CONTENT_EDITOR_BW_ENCODED, baseUrl).toString(), {
      waitUntil: "domcontentloaded",
    });
  } catch {
    // The session may already have expired; continue searching open pages.
  }

  for (const page of context.pages()) {
    if (await logoutCurrentSitecoreSession(page)) {
      logDiagnostic(`[test cleanup] Logging out Sitecore session from ${page.url()}`);
      return;
    }
  }
}

type WorkerFixtures = { sharedBrowserContext: BrowserContext; sharedPage: import("@playwright/test").Page };

type TestFixtures = { resetTestSettings: void };

export const foblesTest = base.extend<TestFixtures, WorkerFixtures>({
  // Start every test with the same settings, even when the previous test
  // changed settings in the shared context.
  resetTestSettings: [
    async ({ sharedBrowserContext }, use, testInfo) => {
      await applyDefaultSettingsProfile(sharedBrowserContext);
      await EnableFoblesDeveloperLogging(sharedBrowserContext);

      try {
        await use();
      } finally {
        try {
          const logs = await GetFoblesPersistedLogs(sharedBrowserContext);
          const logPath = testInfo.outputPath("fobles-persisted.log");

          fs.writeFileSync(logPath, logs, "utf8");

          console.log(`[fobles] Persisted log saved: ${logPath} (${logs.length} chars)`);

          await testInfo.attach("Fobles persisted log", { path: logPath, contentType: "text/x-fobles-log" });

          console.log("[fobles] Persisted log attached");
        } catch (error: unknown) {
          console.error(
            `[fobles] Failed to capture persisted logs: ${
              error instanceof Error ? (error.stack ?? error.message) : String(error)
            }`,
          );
        }
      }
    },
    { auto: true },
  ],

  sharedBrowserContext: [
    // eslint-disable-next-line no-empty-pattern
    async ({}, use) => {
      // Install during execution, not discovery/listing, to avoid wiping
      // the log from an actual run.
      installConsoleLogging();
      logTestDividerStart("Test Start");

      if (RECORD_VIDEO) {
        fs.rmSync(promoVideoDir, { recursive: true, force: true });
        fs.mkdirSync(promoVideoDir, { recursive: true });
      }

      const userDataDir = createBrowserProfile();

      const context = await chromium.launchPersistentContext(userDataDir, {
        channel: "chromium",
        headless: false,
        viewport: VIEWPORT_SIZE,
        ...(RECORD_VIDEO ? { recordVideo: { dir: promoVideoDir, size: VIEWPORT_SIZE } } : {}),
        args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`],
      });

      try {
        await restoreWindowPosition(context);

        const attachPageDiagnostics = (page: import("@playwright/test").Page): void => {
          page.on("console", (message) => {
            const location = message.location().url;
            if (location && isIgnorableDiagnosticUrl(location)) return;

            if (message.type() === "warning") {
              if (!isIgnorableConsoleWarning(message.text())) {
                logDiagnostic(
                  `[browser console:${message.type()}] ${message.text()}${location ? ` (${location})` : ""}`,
                );
              }
            } else if (message.type() === "error") {
              if (!isIgnorableConsoleError(message.text())) {
                logDiagnostic(
                  `[browser console:${message.type()}] ${message.text()}${location ? ` (${location})` : ""}`,
                );
              }
            }
          });

          page.on("response", (response) => {
            if (response.status() >= 400 && !isIgnorableDiagnosticUrl(response.url())) {
              logDiagnostic(`[browser response:${response.status()}] ${response.request().method()} ${response.url()}`);
            }
          });

          page.on("pageerror", (error) => {
            logDiagnostic(`[browser pageerror] ${error.stack ?? error.message}`);
          });

          page.on("requestfailed", (request) => {
            if (!isIgnorableRequestFailure(request)) {
              logDiagnostic(
                `[browser requestfailed] ${request.method()} ${request.url()} - ${
                  request.failure()?.errorText ?? "unknown error"
                }`,
              );
            }
          });

          // Uncomment to diagnose redirects and iframe navigation.
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
      } finally {
        try {
          // Give a human watching the run time to see the final state.
          if (TEST_CONST.TESTING.SPEED.SELECTED !== "SPRINT") {
            await new Promise<void>((resolve) => {
              setTimeout(resolve, 10_000);
            });
          }

          await logoutSitecoreSessions(context);
        } finally {
          // Close even when Sitecore logout fails.
          try {
            await saveWindowPosition(context);
          } finally {
            await context.close();
          }
        }

        if (RECORD_VIDEO) {
          renamePromoVideoFiles();
        }
      }
    },
    { scope: "worker" },
  ],

  // Reuse the same page throughout the worker to reuse the Sitecore session.
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

export async function enableFoblesTestLogging(context: BrowserContext): Promise<void> {
  const serviceWorker = context.serviceWorkers()[0];

  if (!serviceWorker) {
    throw new Error("Fobles service worker not available");
  }

  await serviceWorker.evaluate(async () => {
    await chrome.storage.sync.set({ debugLogging: true, persistDebugLogs: true });

    await chrome.storage.local.remove("persistedLogEntries");
  });

  console.log("[fobles] Debug + persisted logging enabled for test run");
}

export { expect } from "@playwright/test";
export type { Frame, Locator, Page, TestInfo } from "@playwright/test";
