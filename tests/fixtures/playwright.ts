// @source-path [fobles] tests/fixtures/playwright.ts

import { chromium, type BrowserContext, test as base } from "@playwright/test";
import { installConsoleLogging, logDiagnostic } from "./playwright-logging";
import { logoutCurrentSitecoreSession } from "./sitecore";
import { TEST_CONST } from "../constants/TEST_CONST";
import { RECORD_VIDEO } from "../settings/settings";
import { logTestDividerStart } from "../helpers/logging-helpers";
import { applyDefaultSettingsProfile } from "./settings-profiles";
import { enableFoblesDeveloperLogging } from "../macros/fobles-macros";
import { createBrowserProfile } from "./browser-profile";
import { restoreWindowPosition, saveWindowPosition } from "./browser-location";
import { attachPageDiagnosticHandlers } from "./playwright-page-diagnostic-handlers";
import { cleanPromoVideoFiles, getPromoVideoDir, renamePromoVideoFiles } from "./playwright-video-files";
import { attachPersistedLogs } from "./playwright-persisited-logs";
import { TEST_CONSTB } from "./playwright.const";

// This fixture launches its own context, so playwright.config.ts's use.video
// setting is not consulted. RECORD_VIDEO controls recording here directly.
// The context is shared for the worker's entire run.

async function logoutSitecoreSessions(context: BrowserContext): Promise<void> {
  const { getTestEnvironment } = await import("./environment");
  const { baseUrl } = getTestEnvironment();
  const sitecoreOrigin = new URL(baseUrl).origin;
  const page = context.pages().find((candidate) => {
    try {
      return new URL(candidate.url()).origin === sitecoreOrigin;
    } catch {
      return false;
    }
  });
  if (!page) {
    return;
  }

  try {
    // The last test may have left the browser on an admin subpage without
    // shell chrome. Content Editor provides the logout link.
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
      await enableFoblesDeveloperLogging(sharedBrowserContext);
      await attachPersistedLogs(use, sharedBrowserContext, testInfo);
    },
    { auto: true },
  ],

  sharedBrowserContext: [
    // eslint-disable-next-line no-empty-pattern
    async ({}, use, workerInfo) => {
      const workerSlot = workerInfo.parallelIndex + 1;

      // Install during execution, not discovery/listing, to avoid wiping
      // the log from an actual run.
      installConsoleLogging(workerSlot);
      logTestDividerStart("Test Start");

      if (RECORD_VIDEO) {
        cleanPromoVideoFiles();
      }

      const userDataDir = createBrowserProfile(workerSlot);

      const context = await chromium.launchPersistentContext(userDataDir, {
        channel: "chromium",
        headless: false,
        viewport: TEST_CONSTB.VIEWPORT_SIZE,
        ...(RECORD_VIDEO ? { recordVideo: { dir: getPromoVideoDir(), size: TEST_CONSTB.VIEWPORT_SIZE } } : {}),
        args: [
          `--disable-extensions-except=${TEST_CONSTB.extensionPath}`,
          `--load-extension=${TEST_CONSTB.extensionPath}`,
        ],
      });

      try {
        await restoreWindowPosition(context, workerSlot);
        attachPageDiagnosticHandlers(context);
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
            await saveWindowPosition(context, workerSlot);
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

export { expect } from "@playwright/test";

export type { Frame, Locator, Page, TestInfo } from "@playwright/test";
