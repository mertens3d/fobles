import fs from "node:fs";
import type { BrowserContext, TestInfo } from "@playwright/test";
import { GetFoblesPersistedLogs } from "../macros/fobles-macros";

export async function attachPersistedLogs(
  use: (r: void) => Promise<void>,
  sharedBrowserContext: BrowserContext,
  testInfo: TestInfo,
) {
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
        `[fobles] Failed to capture persisted logs: ${error instanceof Error ? (error.stack ?? error.message) : String(error)}`,
      );
    }
  }
}

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
