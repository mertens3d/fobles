// @source-path [fobles] src/content/features/reference-graph/reference-graph.ts

import type { HarvestSession } from "../../sitecore-harvester/harvest-session.types";
import type { SitecoreHarvestFiltersState, SitecoreHarvestResult } from "../../sitecore-harvester/sitecore-harvester.types";
import { buildFoblesUrl } from "../augmentor/helper";
import { getReferenceGraphFilters } from "../../../shared/reference-graph-settings";
import { extensionLog } from "../../logger";
import { PROGRESS_STEPS } from "../../sitecore-harvester/planner/harvest-steps";
import { harvestSitecoreWithWorkers } from "../../sitecore-harvester/coordinator/foreground-harvest-coordinator";
import { createSitecoreItemLocator } from "../../sitecore-harvester/worker-task-executor";
import { getCurrentItemId } from "../../toolbar/jump-flyout/ai-pages";
import { closeReferenceGraphProgressModal, handleHarvestProgress, initializeReferenceGraphProgressModal, openReferenceGraphProgressModal } from "./build-progress";
import { prepareReferenceGraph } from "./prepared-reference-graph";
import { harvestGraphForLink } from "./harvester";
import { openReferenceGraphModal } from "./reference-graph-modal";
import { acquireReferenceGraphSessionLock, releaseReferenceGraphSessionLock } from "./reference-graph-session-lock";
import { startReferenceGraphTimer } from "./reference-graph-timing";
import { disposeBackgroundWorkerPool } from "../../sitecore-worker/pool/worker-pool-client";
import { getScRawValuesState, getScStandardFieldsState } from "../../macros/ribbon-toggle-macro";
import { showFoblesErrorDialog } from "../../../shared/error-dialog";
import { emergencyCleanupWorkerIframes } from "../../sitecore-worker/iframe/worker-iframe-host";
import { createReferenceGraphSessionContainer, removeReferenceGraphSessionContainer } from "./reference-graph-session-container";
import { getItem, putFact } from "../../sitecore-data-cache/sitecore-data-cache";
import type { SitecoreDataCacheKey } from "../../sitecore-data-cache/sitecore-data-cache.types";
import { resolveSitecoreDataIdentity } from "../../sitecore-data/sitecore-data-identity";
import { setActiveHarvestQueue, publishHarvestQueueProgress } from "./lifecycle/active-harvest-queue";
import { createHarvestQueue, type HarvestQueue } from "./lifecycle/harvest-queue";
import { decideRootCacheUsage, rootProcessingStateForDecision } from "./lifecycle/root-cache-flow";
import { readLiveRootRevision } from "./lifecycle/root-revision";
import { publishRootRefresh } from "./lifecycle/root-refresh-events";

export let referenceGraphAbortController: AbortController | undefined;
let activeReferenceGraphSession: ReferenceGraphSession | undefined;

type ReferenceGraphSessionState = "created" | "running" | "restoring" | "displaying" | "disposing" | "closed";

class ReferenceGraphSession {
  private readonly controller = new AbortController();
  private readonly sessionId = crypto.randomUUID();
  private state: ReferenceGraphSessionState = "created";
  private harvestQueue: HarvestQueue | undefined;

  constructor(private readonly doc: Document) { }

  cancel(): void {
    if (this.state === "closed" || this.state === "disposing") return;
    extensionLog.debug("Reference graph session: cancellation requested", { sessionId: this.sessionId, state: this.state });
    this.controller.abort();
    closeReferenceGraphProgressModal(this.doc);
  }

  async run(): Promise<void> {
    this.transition("running");
    createReferenceGraphSessionContainer(this.doc, this.sessionId);
    referenceGraphAbortController = this.controller;
    startReferenceGraphTimer();

    try {
      await this.buildAndDisplayGraph();
    } catch (error) {
      closeReferenceGraphProgressModal(this.doc);
      if (this.controller.signal.aborted) {
        extensionLog.debug("REFERENCE GRAPH: cancelled", { sessionId: this.sessionId, error });
      } else {
        extensionLog.error("REFERENCE GRAPH: harvest or graph preparation failed", { sessionId: this.sessionId, error });
        showFoblesErrorDialog(this.doc, {
          title: "Reference Graph",
          messagePublicFacing: error instanceof Error ? error.message : "Something has gone wrong while building the Reference Graph.",
        });
      }
    } finally {
      await this.close();
    }
  }

  private async buildAndDisplayGraph(): Promise<void> {
    const itemId = getCurrentItemId(this.doc);
    if (!itemId) throw new Error("Something has gone wrong. The current Sitecore item could not be resolved.");

    const filters = await getReferenceGraphFilters();
    const harvestSession = await this.captureHarvestSession();

    const cacheKey: SitecoreDataCacheKey = { ...resolveSitecoreDataIdentity(this.doc), item: createSitecoreItemLocator(itemId) };
    const cachedRecord = await getItem(cacheKey);
    const liveRevision = readLiveRootRevision(this.doc);
    const decision = decideRootCacheUsage(cachedRecord, filters, liveRevision);

    extensionLog.debug("Reference graph: root cache decision", {
      sessionId: this.sessionId,
      decision: decision.kind,
      cachedRevision: cachedRecord?.quickInfo?.value.revision,
      liveRevision,
    });

    let graph: SitecoreHarvestResult | undefined;

    if (decision.kind === "harvest-required") {
      initializeReferenceGraphProgressModal(this.doc, PROGRESS_STEPS, filters);
      openReferenceGraphProgressModal(this.doc, () => this.cancel());

      extensionLog.debug("REFERENCE GRAPH: awaiting worker-pool harvest", { sessionId: this.sessionId });
      graph = await harvestSitecoreWithWorkers(
        { requestId: harvestSession.requestId, url: buildFoblesUrl(itemId), filters, session: harvestSession },
        { signal: this.controller.signal, onProgress: (step, status) => handleHarvestProgress(this.doc, step, status) },
      );
    } else {
      graph = decision.result;

      if (decision.kind === "cache-only" && cachedRecord?.quickInfo) {
        await putFact(cacheKey, "quickInfo", cachedRecord.quickInfo.value, { verifiedAt: Date.now() });
      }
    }

    this.transition("restoring");
    this.throwIfCancelled();
    if (!graph) throw new Error("Something has gone wrong. The Reference Graph harvest returned no graph.");

    const preparedGraph = await prepareReferenceGraph(graph, filters, {
      signal: this.controller.signal,
      onProgress: (step, status) => handleHarvestProgress(this.doc, step, status),
      rootProcessingState: rootProcessingStateForDecision(decision.kind),
    });

    this.throwIfCancelled();
    if (!preparedGraph) throw new Error("Something has gone wrong. The Reference Graph could not be prepared.");

    this.transition("displaying");
    closeReferenceGraphProgressModal(this.doc);

    this.harvestQueue = createHarvestQueue({
      runHarvest: (reference, signal) => this.runBackgroundHarvest(reference, filters, signal),
      onProgress: publishHarvestQueueProgress,
      onError: (reference, error) => extensionLog.warn("Reference graph harvest queue: item failed", { sessionId: this.sessionId, reference, error }),
    });
    setActiveHarvestQueue(this.harvestQueue);

    // Cached data is already on screen - the stale re-harvest converges the graph in the
    // background rather than blocking the user from seeing/using it.
    if (decision.kind === "cache-then-reharvest") {
      this.harvestQueue.enqueue(itemId);
    }

    await openReferenceGraphModal(
      this.doc,
      preparedGraph,
      async (link, graphFilters, existingResult) => await harvestGraphForLink(link, this.doc, this.controller, graphFilters, existingResult),
    );
  }

  // Shared by both the root's own stale-revision re-harvest and any referenced item Resolve
  // discovers with stale structural cache - always a full, fresh harvest (no existingResult
  // reuse), since a stale cache can't be trusted to tell us what's still current.
  private async runBackgroundHarvest(
    reference: string,
    filters: SitecoreHarvestFiltersState,
    signal: AbortSignal,
  ): Promise<void> {
    const result = await harvestSitecoreWithWorkers(
      { requestId: crypto.randomUUID(), url: buildFoblesUrl(reference), filters },
      { signal },
    );

    if (result) {
      extensionLog.debug("Reference graph: background re-harvest complete", {
        sessionId: this.sessionId,
        reference,
        rootItemId: result.rootItem.scItemId,
      });

      publishRootRefresh(result.rootItem.scItemId, result);
    }
  }

  private async captureHarvestSession(): Promise<HarvestSession> {
    const rawValues = await getScRawValuesState(this.doc);
    const standardFields = await getScStandardFieldsState(this.doc);
    const session: HarvestSession = { requestId: crypto.randomUUID(), originalEditorState: { rawValues, standardFields } };
    extensionLog.debug("Reference graph: captured caller editor state", { sessionId: this.sessionId, requestId: session.requestId, rawValues, standardFields });
    return session;
  }

  private throwIfCancelled(): void {
    if (this.controller.signal.aborted) throw new DOMException("Reference Graph cancelled", "AbortError");
  }

  private async close(): Promise<void> {
    if (this.state === "closed" || this.state === "disposing") return;

    this.transition("disposing");
    closeReferenceGraphProgressModal(this.doc);

    this.harvestQueue?.dispose();
    setActiveHarvestQueue(undefined);

    try {
      await disposeBackgroundWorkerPool();
    } catch (error) {
      extensionLog.error("Reference graph session: worker-pool disposal failed", {
        sessionId: this.sessionId,
        error,
      });
    }

    // disposeBackgroundWorkerPool() waits for the pool itself, but iframe removal
    // notifications and host-side tracking can finish immediately afterward.
    // Give that bookkeeping a bounded opportunity to settle before declaring
    // anything orphaned and invoking the emergency cleanup path.
    const cleanupSettled = await this.waitForWorkerCleanupToSettle(1000);

    let cleanup:
      | ReturnType<typeof emergencyCleanupWorkerIframes>
      | undefined;

    if (!cleanupSettled) {
      extensionLog.warn("Reference graph session: normal worker cleanup did not settle", {
        sessionId: this.sessionId,
        domIframes: this.doc.querySelectorAll("iframe[data-worker-id]").length,
      });

      cleanup = emergencyCleanupWorkerIframes(this.doc);
    }

    removeReferenceGraphSessionContainer(this.doc, this.sessionId);

    if (cleanup) {
      const cleanupSucceeded =
        cleanup.orphanCountAfter === 0 &&
        cleanup.trackedCountAfter === 0 &&
        !cleanup.containerExistsAfter;

      showFoblesErrorDialog(this.doc, {
        title: cleanupSucceeded
          ? "Reference Graph Worker Cleanup"
          : "Reference Graph Worker Cleanup Failed",
        messagePublicFacing:
          `<p>Fobles detected ${cleanup.orphanCountBefore} background worker(s) that were not removed normally during Reference Graph cleanup.</p>` +
          `<p>${cleanupSucceeded
            ? "The remaining worker(s) were forcibly removed."
            : "The emergency cleanup could not remove every remaining worker."
          } If logging is enabled, diagnostic details were written to the Fobles log.</p>` +
          `<p>If you are able to reproduce this error, enable Fobles logging and run the Reference Graph again.</p>` +
          `<p>Submit a bug report at <a href="https://github.com/mertens3d/fobles/issues" target="_blank" rel="noopener noreferrer">Fobles GitHub Issues</a>. Include the logs and any other information that may be relevant.</p>` +
          `<p><strong>Before posting logs publicly:</strong> review them for Sitecore URLs, paths, IDs, or other environment-specific information.</p>`,
      });
    }

    if (referenceGraphAbortController === this.controller) {
      referenceGraphAbortController = undefined;
    }

    this.transition("closed");

    extensionLog.debug("Reference graph session: closed", {
      sessionId: this.sessionId,
      domIframes: this.doc.querySelectorAll("iframe[data-worker-id]").length,
      emergencyCleanupRequired: Boolean(cleanup),
    });
  }

  private async waitForWorkerCleanupToSettle(timeoutMs: number): Promise<boolean> {
    const intervalMs = 50;
    const deadline = performance.now() + timeoutMs;
    let settled =
      this.doc.querySelectorAll("iframe[data-worker-id]").length === 0;

    while (!settled && performance.now() < deadline) {
      await new Promise<void>((resolve) => {
        setTimeout(resolve, intervalMs);
      });

      settled =
        this.doc.querySelectorAll("iframe[data-worker-id]").length === 0;
    }

    extensionLog.debug("Reference graph session: normal worker cleanup verification", {
      sessionId: this.sessionId,
      timeoutMs,
      settled,
      domIframes: this.doc.querySelectorAll("iframe[data-worker-id]").length,
    });

    return settled;
  }

  private transition(nextState: ReferenceGraphSessionState): void {
    const previousState = this.state;
    this.state = nextState;
    extensionLog.debug("Reference graph session: state changed", { sessionId: this.sessionId, previousState, nextState });
  }
}

export async function openReferenceGraph(doc: Document): Promise<void> {
  if (activeReferenceGraphSession) return;

  const acquired = await acquireReferenceGraphSessionLock();
  if (!acquired) {
    showFoblesErrorDialog(doc, {
      title: "Reference Graph Already Active",
      messagePublicFacing: "Only one Reference Graph can be active in this browser session. Close the existing graph, or use another browser profile or Incognito window.",
    });
    return;
  }

  const session = new ReferenceGraphSession(doc);
  activeReferenceGraphSession = session;
  try {
    await session.run();
  } finally {
    if (activeReferenceGraphSession === session) activeReferenceGraphSession = undefined;
    await releaseReferenceGraphSessionLock();
  }
}
