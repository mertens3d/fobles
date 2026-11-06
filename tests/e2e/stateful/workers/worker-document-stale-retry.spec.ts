import { TEST_CONST } from "../../../constants/TEST_CONST";
import {
  DATABASE_NAME,
  FACT_STORE_NAME,
  ITEM_STORE_NAME,
} from "../../../../src/content/foundation/cache/sitecore-data/indexed-db";
import { expect, foblesTest, type Page } from "../../../fixtures/playwright";
import { createFoblesStep } from "../../../helpers/fobles-helpers-support/test-step";
import {
  ClickFoblesGraphButton,
  CloseFoblesGraph,
  GetFoblesPersistedLogs,
  WaitForFoblesGraphEnrichmentComplete,
} from "../../../macros/fobles-macros";
import { setupReferenceGraphState } from "../harvest/harvest-test-helpers";

async function clearSitecoreDataCache(page: Page): Promise<void> {
  await page.evaluate(async ({ databaseName, storeNames }) => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(databaseName);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error("Could not open Sitecore data cache"));
    });
    const existingStores = storeNames.filter((name) => database.objectStoreNames.contains(name));
    if (existingStores.length > 0) {
      await new Promise<void>((resolve, reject) => {
        const transaction = database.transaction(existingStores, "readwrite");
        for (const name of existingStores) {
          transaction.objectStore(name).clear();
        }
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error ?? new Error("Could not clear Sitecore data cache"));
        transaction.onabort = () => reject(transaction.error ?? new Error("Sitecore data cache clear was aborted"));
      });
    }
    database.close();
  }, { databaseName: DATABASE_NAME, storeNames: [FACT_STORE_NAME, ITEM_STORE_NAME] });
}

foblesTest.describe("Worker pool", () => {
  foblesTest(
    "retries editor-state tasks after the worker document becomes stale",
    async ({ page, sharedBrowserContext }, testInfo) => {
      foblesTest.setTimeout(TEST_CONST.TESTING.TIMEOUTS.TEST_SUITE_MS);

      const serviceWorker =
        sharedBrowserContext.serviceWorkers()[0] ?? (await sharedBrowserContext.waitForEvent("serviceworker"));

      await serviceWorker.evaluate(async () => {
        await chrome.storage.local.remove("persistedLogEntries");
      });

      await setupReferenceGraphState(page, { rawValues: true, standardFields: false });
      await clearSitecoreDataCache(page);

      await ClickFoblesGraphButton(page);
      const graphDialog = page.locator(`#${TEST_CONST.FOBLES.DOM.IDS.DIALOG_ID}`);
      const step = createFoblesStep(page, testInfo, graphDialog, "Worker Stale Retry");
      await step("Graph harvest retries stale editor-state work and completes", async () => {
        await WaitForFoblesGraphEnrichmentComplete(page);
        await expect(graphDialog).toBeVisible();
      });
      await step("Graph closes after the worker retry succeeds", async () => {
        await CloseFoblesGraph(page);
        await expect(graphDialog).toHaveCount(0);
      }, { screenshot: false });

      const logs = await GetFoblesPersistedLogs(sharedBrowserContext);

      expect(logs).toContain("resultStatus=document-stale");
      expect(logs).toContain("Worker pool: document-stale result intercepted");
      expect(logs).toContain("Worker pool: document stale; worker retired; retrying task on fresh worker");
      expect(logs).toContain("resultStatus=success");
    },
  );
});
