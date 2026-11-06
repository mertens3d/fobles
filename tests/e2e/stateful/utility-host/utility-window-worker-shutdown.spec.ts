import { expect, foblesTest } from "../../../fixtures/playwright";
import { createFoblesStep } from "../../../helpers/fobles-helpers-support/test-step";
import { TEST_CONST } from "../../../constants/TEST_CONST";
import { ClickFoblesGraphButton, CloseFoblesGraph, WaitForFoblesGraphEnrichmentComplete } from "../../../macros/fobles-macros";
import { setupReferenceGraphState } from "../harvest/harvest-test-helpers";
import { WORKER_POOL } from "../../../../src/constants/partials/fobles-workers.const";
import { FOBLES_ERROR_DIALOG_ID } from "../../../../src/shared/error-dialog";
import { FOBLES_YML } from "../../shared/strategies/support/yml-fobles.CONST";

const WORKER_IFRAME_SELECTOR = WORKER_POOL.WORKER_IFRAME_SELECTOR;
const FALLBACK_ERROR_DIALOG_SELECTOR = `#${FOBLES_ERROR_DIALOG_ID}`;

foblesTest.describe("Utility window worker shutdown", () => {
  foblesTest("closing the graph disposes its background worker iframes", async ({ page }, testInfo) => {
    foblesTest.setTimeout(TEST_CONST.TESTING.TIMEOUTS.TEST_SUITE_MS);

    await setupReferenceGraphState(page, { rawValues: false, standardFields: false });
    await ClickFoblesGraphButton(page);

    const graphDialog = page.locator(`#${TEST_CONST.FOBLES.DOM.IDS.DIALOG_ID}`);
    const step = createFoblesStep(page, testInfo, page, "Utility Window Worker Shutdown");
    await WaitForFoblesGraphEnrichmentComplete(page);
    await expect(page.locator(WORKER_IFRAME_SELECTOR).first()).toBeAttached();

    await step("Closing the graph removes its worker iframes", async () => {
      await CloseFoblesGraph(page);
      await expect(graphDialog).toHaveCount(0);
      await expect(page.locator(WORKER_IFRAME_SELECTOR)).toHaveCount(0);
      await expect(page.locator(`#${WORKER_POOL.WORKER_IFRAME_CONTAINER_ID}`)).toHaveCount(0);
      await expect(page.locator(FALLBACK_ERROR_DIALOG_SELECTOR)).toHaveCount(0);
    });
  });

  foblesTest("closing during stalled active enrichment removes workers with failsafe cleanup", async ({ page }, testInfo) => {
    foblesTest.setTimeout(TEST_CONST.TESTING.TIMEOUTS.TEST_SUITE_MS);
    await setupReferenceGraphState(page, { rawValues: false, standardFields: false });

    const rootId = FOBLES_YML.CONTENT.STRATEGY_DROPLINK.id.toLowerCase();
    const origin = new URL(page.url()).origin;
    const workerRoute = (url: URL): boolean =>
      url.origin === origin &&
      url.searchParams.has(WORKER_POOL.WORKER_ID_QUERY_PARAMETER) &&
      url.searchParams.has("fo") &&
      (url.searchParams.get("fo") ?? "").replace(/[{}]/g, "").toLowerCase() !== rootId;
    let releaseRequests: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      releaseRequests = resolve;
    });
    let heldRequests = 0;
    await page.route(workerRoute, async (route) => {
      heldRequests += 1;
      await gate;
      await route.abort().catch(() => {});
    });

    const graphDialog = page.locator(`#${TEST_CONST.FOBLES.DOM.IDS.DIALOG_ID}`);
    const fallbackDialog = page.locator(FALLBACK_ERROR_DIALOG_SELECTOR);
    const step = createFoblesStep(page, testInfo, fallbackDialog, "Utility Window Active Worker Shutdown");
    try {
      await ClickFoblesGraphButton(page);
      await expect.poll(() => heldRequests).toBeGreaterThan(0);
      await expect(graphDialog.locator(".fobles-reference-graph-app")).toHaveAttribute("data-enrichment-status", "running");
      await expect(page.locator(WORKER_IFRAME_SELECTOR).first()).toBeAttached();
      await step("Close removes blocked active workers and reports forced cleanup", async () => {
        await CloseFoblesGraph(page);
        await expect(page.locator(WORKER_IFRAME_SELECTOR)).toHaveCount(0);
        await expect(page.locator(`#${WORKER_POOL.WORKER_IFRAME_CONTAINER_ID}`)).toHaveCount(0);
        await expect(fallbackDialog).toBeVisible();
        await expect(fallbackDialog).toContainText("forcibly removed background workers");
      });
      await fallbackDialog.getByRole("button", { name: "Close", exact: true }).click();
    } finally {
      releaseRequests();
      await page.unrouteAll({ behavior: "ignoreErrors" });
    }
  });

  foblesTest("fallback cleanup removes orphan worker iframes and reports the failsafe", async ({ page }, testInfo) => {
    foblesTest.setTimeout(TEST_CONST.TESTING.TIMEOUTS.TEST_SUITE_MS);

    await setupReferenceGraphState(page, { rawValues: false, standardFields: false });
    await ClickFoblesGraphButton(page);
    await WaitForFoblesGraphEnrichmentComplete(page);

    await page.evaluate(() => {
      const orphan = document.createElement("iframe");
      orphan.dataset.workerId = "fobles-test-orphan";
      document.body.appendChild(orphan);
    });

    const fallbackDialog = page.locator(FALLBACK_ERROR_DIALOG_SELECTOR);
    const step = createFoblesStep(page, testInfo, fallbackDialog, "Utility Window Worker Fallback Cleanup");
    await step("Fallback removes the orphan and reports forced cleanup", async () => {
      await CloseFoblesGraph(page);
      await expect(fallbackDialog).toBeVisible();
      await expect(fallbackDialog).toContainText("forcibly removed background workers");
      await expect(page.locator(WORKER_IFRAME_SELECTOR)).toHaveCount(0);
    });
    await fallbackDialog.getByRole("button", { name: "Close", exact: true }).click();
  });
});
