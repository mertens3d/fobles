import { expect, foblesTest } from "../../fixtures/playwright";
import { TEST_CONST } from "../../constants/TEST_CONST";
import {
  ClickFoblesGraphButton,
  CloseFoblesGraph,
  GetFoblesPersistedLogs,
  WaitForFoblesGraphEnrichmentComplete,
} from "../../macros/fobles-macros";
import { setupReferenceGraphState } from "../harvest/harvest-test-helpers";

foblesTest.describe("Worker pool", () => {
  foblesTest(
    "retries editor-state tasks after the worker document becomes stale",
    async ({ page, sharedBrowserContext }) => {
      foblesTest.setTimeout(TEST_CONST.TESTING.TIMEOUTS.TEST_SUITE_MS);

      const serviceWorker =
        sharedBrowserContext.serviceWorkers()[0] ??
        (await sharedBrowserContext.waitForEvent("serviceworker"));

      await serviceWorker.evaluate(async () => {
        await chrome.storage.local.remove("persistedLogEntries");
      });

      await setupReferenceGraphState(page, {
        rawValues: false,
        standardFields: false,
      });

      await ClickFoblesGraphButton(page);
      await WaitForFoblesGraphEnrichmentComplete(page);
      await CloseFoblesGraph(page);

      const logs = await GetFoblesPersistedLogs(sharedBrowserContext);

      expect(logs).toContain("resultStatus=document-stale");
      expect(logs).toContain("Worker pool: document-stale result intercepted");
      expect(logs).toContain(
        "Worker pool: document stale; worker retired; retrying task on fresh worker",
      );
      expect(logs).toContain("resultStatus=success");
    },
  );
});