// @source-path [fobles] src/content/foundation/reference-data/processing/session/reference-model-session.ts

import { extensionLog } from "../../../../logger";
import * as cache from "../../../cache/sitecore-data/sitecore-data-cache";
import type { SitecoreDataCacheKey, SitecoreDataFactMap, SitecoreDataFactName } from "../../../cache/sitecore-data/sitecore-data.types";
import { harvestSitecoreWithWorkers } from "../../../harvesting/coordinator/foreground-harvest-coordinator";
import { resolveSitecoreDataIdentity } from "../../../sitecore/data/sitecore-data-identity";
import { buildFoblesUrl } from "../../../sitecore/fobles-url";
import type { SitecoreItemLocator, WorkerTask } from "../../../workers/tasks/tasks.types.js";
import { acquireReferenceModelForCurrentItem } from "../../acquisition/acquire-reference-model.ts";
import { patchReferenceModelFact } from "../../model/reference-model-fact-patcher.ts";
import { collectReferenceHarvestingCandidateLookup } from "../candidates/reference-harvesting-candidate-collector.ts";
import type { ReferenceHarvestingJob, ReferenceHarvestingProgress, ReferenceHarvestingQueue, ReferenceModelProcessingController, ReferenceModelProcessingProgress } from "../processing.types.ts";
import type { ReferenceModelSessionStateChange, SharedReferenceModelSession, StartSharedReferenceModelSessionOptions } from "../processing.types.ts";
import { startReferenceModelProcessor } from "../processor/reference-model-processor.ts";
import { createReferenceHarvestingQueue } from "../queue/reference-harvesting-queue.ts";
import { factFromResult, filtersForFact, relationshipLocators, sameItem } from "./reference-model-session-facts.ts";
import { FACTS_BY_FILTER } from "./session.const.ts";

const sessionsByWorkSessionId = new Map<string, SharedReferenceModelSession>();

export function getSharedReferenceModelSession(workSessionId: string): SharedReferenceModelSession | undefined {
  return sessionsByWorkSessionId.get(workSessionId);
}

export async function startSharedReferenceModelSession({
  doc,
  workSession,
  filters,
  signal,
  onAcquireProgress,
  onHarvestRequired,
  onRootRefresh,
  onModelReady,
}: StartSharedReferenceModelSessionOptions): Promise<SharedReferenceModelSession | undefined> {
  sessionsByWorkSessionId.get(workSession.id)?.dispose();
  const acquired = await acquireReferenceModelForCurrentItem(doc, workSession, filters, {
    signal,
    onProgress: onAcquireProgress,
    onHarvestRequired,
  });
  if (!acquired || signal.aborted) {
    return undefined;
  }
  const { itemId, prepared, decision } = acquired;
  onModelReady?.(prepared);
  const identity = resolveSitecoreDataIdentity(doc);
  const stateListeners = new Set<ReferenceModelSessionStateChange>();
  const processingProgressListeners = new Set<(progress: ReferenceModelProcessingProgress) => void>();
  const harvestProgressListeners = new Set<(progress: ReferenceHarvestingProgress) => void>();
  const harvestActivityListeners = new Set<() => void>();
  let latestProcessingProgress: ReferenceModelProcessingProgress | undefined;
  let latestHarvestProgress: ReferenceHarvestingProgress | undefined;
  const cacheRevalidationResultByTreeNodeId = new Map<string, "passed" | "error">();
  const referenceHarvestingCandidateTreeNodeIds = new Set<string>(
    Array.from(collectReferenceHarvestingCandidateLookup(prepared.referenceModel).values()).flat(),
  );
  const rootItem: SitecoreItemLocator = { kind: "id", value: itemId };
  const rootFacts = FACTS_BY_FILTER.filter(([filter]) => filters[filter]).map(([, factName]) => factName);
  let disposed = false;
  let activeFilters = filters;

  function isFactEnabled(factName: SitecoreDataFactName): boolean {
    if (factName === "quickInfo") {
      return true;
    }
    return FACTS_BY_FILTER.some(([filter, fact]) => fact === factName && activeFilters[filter]);
  }

  function cacheKey(item: SitecoreItemLocator): SitecoreDataCacheKey {
    return { ...identity, item };
  }

  async function publish(changedTreeNodeIds: readonly string[]): Promise<void> {
    collectReferenceHarvestingCandidateLookup(prepared.referenceModel).forEach((treeNodeIds) =>
      treeNodeIds.forEach((treeNodeId) => referenceHarvestingCandidateTreeNodeIds.add(treeNodeId)),
    );
    for (const listener of stateListeners) {
      await listener(changedTreeNodeIds, "enriched", prepared.processingStateByTreeNodeId);
    }
    harvestActivityListeners.forEach((listener) => listener());
  }

  async function hydrateOrQueue(item: SitecoreItemLocator): Promise<void> {
    const cached = await cache.getCachedFact(cacheKey(item), "quickInfo");
    if (cached) {
      await publish(patchReferenceModelFact(prepared, item, "quickInfo", cached.value, activeFilters));
      return;
    }
    harvestingQueue.enqueue({ item, factName: "quickInfo" });
  }

  async function runQuickInfo(job: ReferenceHarvestingJob): Promise<void> {
    const task: Omit<Extract<WorkerTask, { type: "get-quick-info" }>, "requestId"> = {
      taskId: crypto.randomUUID(),
      type: "get-quick-info",
      url: buildFoblesUrl(job.item.value),
      requested: job.item,
    };
    const result = await workSession.runTask(task);
    if (!result || result.status !== "success" || result.type !== "get-quick-info") {
      throw new Error(`Quick Info failed for ${job.item.value}`);
    }
    const value: SitecoreDataFactMap["quickInfo"] = { result: result.payload.result };
    await cache.putFact(cacheKey(job.item), "quickInfo", value, { revision: result.payload.revision });
    await publish(patchReferenceModelFact(prepared, job.item, "quickInfo", value, activeFilters));
    await Promise.all(relationshipLocators("quickInfo", value).map(hydrateOrQueue));
  }

  async function runCrop(job: ReferenceHarvestingJob, harvestSignal: AbortSignal): Promise<void> {
    const requestId = crypto.randomUUID();
    const harvestRequest = {
      requestId,
      url: buildFoblesUrl(job.item.value),
      filters: filtersForFact(job.factName),
      ...(job.factName === "layout"
        ? {
            session: {
              requestId,
              originalEditorState: {
                rawValues: await import("../../../sitecore/macros/ribbon-toggle-macro").then(({ getScRawValuesState }) =>
                  getScRawValuesState(doc),
                ),
                standardFields: await import("../../../sitecore/macros/ribbon-toggle-macro").then(
                  ({ getScStandardFieldsState }) => getScStandardFieldsState(doc),
                ),
              },
            },
          }
        : {}),
    };
    const result = await harvestSitecoreWithWorkers(harvestRequest, { signal: harvestSignal });
    if (!result) {
      throw new Error(`Reference Harvesting produced no ${job.factName} fact for ${job.item.value}`);
    }
    const value = factFromResult(job.factName, result);
    await cache.putFact(cacheKey(job.item), job.factName, value);
    await publish(patchReferenceModelFact(prepared, job.item, job.factName, value, activeFilters));
    await Promise.all(relationshipLocators(job.factName, value).map(hydrateOrQueue));
    if (sameItem(job.item, rootItem)) {
      onRootRefresh?.(prepared.harvestedData);
    }
  }

  const harvestingQueue: ReferenceHarvestingQueue = createReferenceHarvestingQueue({
    runJob: async (job, harvestSignal) =>
      job.factName === "quickInfo" ? runQuickInfo(job) : runCrop(job, harvestSignal),
    onProgress: (progress) => {
      latestHarvestProgress = progress;
      harvestProgressListeners.forEach((listener) => listener(progress));
      harvestActivityListeners.forEach((listener) => listener());
    },
    onError: (job, error) =>
      extensionLog.warn("Reference Harvesting job failed", { workSessionId: workSession.id, job, error }),
  });

  if (decision.kind === "harvest-required" || decision.kind === "cache-then-reharvest") {
    rootFacts.forEach((factName) => harvestingQueue.enqueue({ item: rootItem, factName }));
  }

  const processor: ReferenceModelProcessingController = startReferenceModelProcessor({
    doc,
    workSession,
    referenceModel: prepared.referenceModel,
    nodesById: prepared.nodesById,
    processingStateByTreeNodeId: prepared.processingStateByTreeNodeId,
    onStateChange: async (treeNodeIds, status, state) => {
      for (const listener of stateListeners) {
        await listener(treeNodeIds, status, state);
      }
    },
    onStaleStructural: (reference, treeNodeIds, setTerminalState) => {
      const item: SitecoreItemLocator = reference.startsWith("/")
        ? { kind: "path", value: reference }
        : { kind: "id", value: reference };
      const demandedFacts: SitecoreDataFactName[] = sameItem(item, rootItem) ? rootFacts : ["quickInfo"];
      let remaining = demandedFacts.length;
      let succeeded = true;
      demandedFacts.forEach((factName) =>
        harvestingQueue.enqueue({ item, factName }, (jobSucceeded) => {
          succeeded &&= jobSucceeded;
          remaining -= 1;
          if (remaining === 0) {
            treeNodeIds.forEach((treeNodeId) =>
              cacheRevalidationResultByTreeNodeId.set(treeNodeId, succeeded ? "passed" : "error"),
            );
            setTerminalState(succeeded);
          }
        }),
      );
    },
    onProgress: (progress) => {
      latestProcessingProgress = progress;
      processingProgressListeners.forEach((listener) => listener(progress));
    },
    harvestActivity: {
      pendingCount: harvestingQueue.pendingCount,
      subscribe: (listener) => {
        harvestActivityListeners.add(listener);
        return () => harvestActivityListeners.delete(listener);
      },
    },
  });

  const session: SharedReferenceModelSession = {
    itemId,
    prepared,
    referenceHarvestingCandidateTreeNodeIds,
    cacheRevalidationResultByTreeNodeId,
    processingCompletion: processor.completion,
    subscribeStateChange: (listener) => {
      stateListeners.add(listener);
      return () => stateListeners.delete(listener);
    },
    subscribeProcessingProgress: (listener) => {
      processingProgressListeners.add(listener);
      if (latestProcessingProgress) {
        listener(latestProcessingProgress);
      }
      return () => processingProgressListeners.delete(listener);
    },
    subscribeHarvestProgress: (listener) => {
      harvestProgressListeners.add(listener);
      if (latestHarvestProgress) {
        listener(latestHarvestProgress);
      }
      return () => harvestProgressListeners.delete(listener);
    },
    updateFilters: (nextFilters) => {
      const previousFilters = activeFilters;
      activeFilters = nextFilters;
      harvestingQueue.remove((job) => !isFactEnabled(job.factName));
      // Agent: A filter that just turned on was never part of the original harvest, so the root item's
      // Agent: fact for it has to be (re)enqueued now - otherwise it never joins the reference model.
      FACTS_BY_FILTER.filter(
        ([filter, factName]) => !previousFilters[filter] && nextFilters[filter] && isFactEnabled(factName),
      ).forEach(([, factName]) => harvestingQueue.enqueue({ item: rootItem, factName }));
      harvestActivityListeners.forEach((listener) => listener());
    },
    dispose: () => {
      if (disposed) {
        return;
      }
      disposed = true;
      processor.dispose();
      harvestingQueue.dispose();
      stateListeners.clear();
      processingProgressListeners.clear();
      harvestProgressListeners.clear();
      harvestActivityListeners.clear();
      if (sessionsByWorkSessionId.get(workSession.id) === session) {
        sessionsByWorkSessionId.delete(workSession.id);
      }
    },
  };
  sessionsByWorkSessionId.set(workSession.id, session);
  return session;
}
