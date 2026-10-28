// @source-path [fobles] src/content/foundation/reference-data/processing/reference-model-session.ts

import { extensionLog } from "../../../logger";
import * as cache from "../../cache/sitecore-data/sitecore-data-cache";
import type { SitecoreDataCacheKey, SitecoreDataFactMap, SitecoreDataFactName } from "../../cache/sitecore-data/sitecore-data-cache.types";
import { harvestSitecoreWithWorkers } from "../../harvesting/coordinator/foreground-harvest-coordinator";
import type { HarvestProgressCallback, SitecoreHarvestFiltersState, SitecoreHarvestResult } from "../../harvesting/sitecore-harvester.types";
import { resolveSitecoreDataIdentity } from "../../sitecore/data/sitecore-data-identity";
import { buildFoblesUrl } from "../../sitecore/fobles-url";
import type { WorkSession } from "../../workers/session/work-session.types";
import type { SitecoreItemLocator, WorkerTask } from "../../workers/tasks/worker-task.types";
import { acquireReferenceModelForCurrentItem } from "../acquisition/acquire-reference-model";
import type { PreparedReferenceModel } from "../acquisition/prepare-reference-model";
import { collectEnrichmentGuidLookup } from "./resolve-candidate-collector";
import { createReferenceHarvestingQueue, type ReferenceHarvestingJob, type ReferenceHarvestingProgress, type ReferenceHarvestingQueue } from "./reference-harvesting-queue";
import { patchReferenceModelFact } from "./reference-model-fact-patcher";
import type { ReferenceModelProcessingController, ReferenceModelProcessingProgress } from "./reference-model-processing.types";
import { startReferenceModelProcessor } from "./reference-model-processor";
import type { ProcessingStateByTreeNodeId, ProcessingStatus } from "./processing-state";

export type ReferenceModelSessionStateChange = (treeNodeIds: readonly string[], status: ProcessingStatus, state: ProcessingStateByTreeNodeId) => void | Promise<void>;
export type SharedReferenceModelSession = {
  itemId: string;
  prepared: PreparedReferenceModel;
  resolveCandidateTreeNodeIds: ReadonlySet<string>;
  cacheRevalidationResultByTreeNodeId: ReadonlyMap<string, "passed" | "error">;
  processingCompletion: Promise<void>;
  subscribeStateChange: (listener: ReferenceModelSessionStateChange) => () => void;
  subscribeProcessingProgress: (listener: (progress: ReferenceModelProcessingProgress) => void) => () => void;
  subscribeHarvestProgress: (listener: (progress: ReferenceHarvestingProgress) => void) => () => void;
  dispose: () => void;
};
export type StartSharedReferenceModelSessionOptions = {
  doc: Document;
  workSession: WorkSession;
  filters: SitecoreHarvestFiltersState;
  signal: AbortSignal;
  onAcquireProgress?: HarvestProgressCallback;
  onHarvestRequired?: () => void;
  onRootRefresh?: (result: SitecoreHarvestResult) => void;
  onModelReady?: (prepared: PreparedReferenceModel) => void;
};

const sessionsByWorkSessionId = new Map<string, SharedReferenceModelSession>();
const FACTS_BY_FILTER: ReadonlyArray<[keyof SitecoreHarvestFiltersState, SitecoreDataFactName]> = [
  ["parent", "parent"], ["children", "children"], ["referrers", "referrers"], ["customFields", "customSections"],
  ["standardFields", "standardSections"], ["layouts", "layout"],
];

function filtersForFact(factName: SitecoreDataFactName): SitecoreHarvestFiltersState {
  return {
    parent: factName === "parent", children: factName === "children", referrers: factName === "referrers",
    customFields: factName === "customSections", standardFields: factName === "standardSections", layouts: factName === "layout",
    template: factName === "quickInfo",
  };
}
function factFromResult<K extends SitecoreDataFactName>(factName: K, result: SitecoreHarvestResult): SitecoreDataFactMap[K] {
  const value = factName === "quickInfo" ? { result: { requested: { kind: "id" as const, value: result.rootItem.scItemId }, status: "found" as const, value: result.rootItem } }
    : factName === "parent" ? { parent: result.parent }
      : factName === "children" ? { childItems: result.childItems ?? [] }
        : factName === "referrers" ? { referrers: result.referrers ?? [] }
          : factName === "customSections" ? { sections: result.customFieldSections ?? [] }
            : factName === "standardSections" ? { sections: result.standardFieldSections ?? [] }
              : { layoutSectionFields: result.layoutSectionFields ?? [] };
  return value as unknown as SitecoreDataFactMap[K];
}
function locatorFromItem(item: SitecoreDataFactMap["parent"]["parent"]): SitecoreItemLocator | undefined {
  const id = item?.scItemId?.replace(/[{}]/g, "").trim();
  if (id) return { kind: "id", value: id };
  const path = item?.scItemPath?.trim();
  return path ? { kind: "path", value: path } : undefined;
}
function relationshipLocators<K extends SitecoreDataFactName>(factName: K, value: SitecoreDataFactMap[K]): SitecoreItemLocator[] {
  if (factName === "parent") {
    const locator = locatorFromItem((value as SitecoreDataFactMap["parent"]).parent);
    return locator ? [locator] : [];
  }
  if (factName === "children") return (value as SitecoreDataFactMap["children"]).childItems.map(locatorFromItem).filter((item): item is SitecoreItemLocator => item !== undefined);
  if (factName === "referrers") return (value as SitecoreDataFactMap["referrers"]).referrers.map(locatorFromItem).filter((item): item is SitecoreItemLocator => item !== undefined);
  return [];
}

export function getSharedReferenceModelSession(workSessionId: string): SharedReferenceModelSession | undefined { return sessionsByWorkSessionId.get(workSessionId); }

export async function startSharedReferenceModelSession({
  doc, workSession, filters, signal, onAcquireProgress, onHarvestRequired, onRootRefresh, onModelReady,
}: StartSharedReferenceModelSessionOptions): Promise<SharedReferenceModelSession | undefined> {
  sessionsByWorkSessionId.get(workSession.id)?.dispose();
  const acquired = await acquireReferenceModelForCurrentItem(doc, workSession, filters, { signal, onProgress: onAcquireProgress, onHarvestRequired });
  if (!acquired || signal.aborted) return undefined;

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
  const guidLookup = collectEnrichmentGuidLookup(prepared.referenceModel);
  const resolveCandidateTreeNodeIds = new Set<string>(Array.from(guidLookup.values()).flat());
  let disposed = false;
  let harvestingQueue: ReferenceHarvestingQueue;

  function cacheKey(item: SitecoreItemLocator): SitecoreDataCacheKey { return { ...identity, item }; }
  async function publish(changedTreeNodeIds: readonly string[]): Promise<void> {
    for (const listener of stateListeners) await listener(changedTreeNodeIds, "enriched", prepared.processingStateByTreeNodeId);
    harvestActivityListeners.forEach((listener) => listener());
  }
  async function hydrateOrQueue(item: SitecoreItemLocator): Promise<void> {
    const cached = await cache.getFact(cacheKey(item), "quickInfo");
    if (cached) {
      await publish(patchReferenceModelFact(prepared, item.value, "quickInfo", cached.value));
      return;
    }
    harvestingQueue.enqueue({ item, factName: "quickInfo" });
  }
  async function runQuickInfo(job: ReferenceHarvestingJob): Promise<void> {
    const task: Omit<Extract<WorkerTask, { type: "get-quick-info" }>, "requestId"> = {
      taskId: crypto.randomUUID(), type: "get-quick-info", url: buildFoblesUrl(job.item.value), requested: job.item,
    };
    const result = await workSession.runTask(task);
    if (!result || result.status !== "success" || result.type !== "get-quick-info") throw new Error(`Quick Info failed for ${job.item.value}`);
    await cache.putFact(cacheKey(job.item), "quickInfo", { result: result.payload.result }, { revision: result.payload.revision });
    await publish(patchReferenceModelFact(prepared, job.item.value, "quickInfo", { result: result.payload.result }));
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
              rawValues: await import("../../sitecore/macros/ribbon-toggle-macro").then(({ getScRawValuesState }) => getScRawValuesState(doc)),
              standardFields: await import("../../sitecore/macros/ribbon-toggle-macro").then(({ getScStandardFieldsState }) => getScStandardFieldsState(doc)),
            },
          },
        }
      : {}),
  };

  const result = await harvestSitecoreWithWorkers(harvestRequest, { signal: harvestSignal });

  if (!result) throw new Error(`Reference Harvesting produced no ${job.factName} fact for ${job.item.value}`);

  const value = factFromResult(job.factName, result);

  await cache.putFact(cacheKey(job.item), job.factName, value);
  await publish(patchReferenceModelFact(prepared, job.item.value, job.factName, value));
  await Promise.all(relationshipLocators(job.factName, value).map(hydrateOrQueue));

  if (job.item.kind === "id" && job.item.value.replace(/[{}]/g, "").toLowerCase() === itemId.replace(/[{}]/g, "").toLowerCase()) {
    onRootRefresh?.(prepared.harvestedData);
  }
}

  harvestingQueue = createReferenceHarvestingQueue({
    runJob: async (job, harvestSignal) => job.factName === "quickInfo" ? runQuickInfo(job) : runCrop(job, harvestSignal),
    onProgress: (progress) => {
      latestHarvestProgress = progress;
      harvestProgressListeners.forEach((listener) => listener(progress));
      harvestActivityListeners.forEach((listener) => listener());
    },
    onError: (job, error) => extensionLog.warn("Reference Harvesting job failed", { workSessionId: workSession.id, job, error }),
  });

  const rootItem: SitecoreItemLocator = { kind: "id", value: itemId };
  const rootFacts = FACTS_BY_FILTER.filter(([filter]) => filters[filter]).map(([, factName]) => factName);
  if (decision.kind === "harvest-required" || decision.kind === "cache-then-reharvest") rootFacts.forEach((factName) => harvestingQueue.enqueue({ item: rootItem, factName }));

  const processor: ReferenceModelProcessingController = startReferenceModelProcessor({
    doc, workSession, referenceModel: prepared.referenceModel, nodesById: prepared.nodesById,
    processingStateByTreeNodeId: prepared.processingStateByTreeNodeId,
    onStateChange: async (treeNodeIds, status, state) => { for (const listener of stateListeners) await listener(treeNodeIds, status, state); },
    onStaleStructural: (reference, treeNodeIds, setTerminalState) => {
      const item: SitecoreItemLocator = reference.startsWith("/") ? { kind: "path", value: reference } : { kind: "id", value: reference };
      if (rootFacts.length === 0) { setTerminalState(true); return; }
      let remaining = rootFacts.length;
      let succeeded = true;
      rootFacts.forEach((factName) => harvestingQueue.enqueue({ item, factName }, (jobSucceeded) => {
        succeeded &&= jobSucceeded;
        remaining -= 1;
        if (remaining === 0) {
          treeNodeIds.forEach((treeNodeId) => cacheRevalidationResultByTreeNodeId.set(treeNodeId, succeeded ? "passed" : "error"));
          setTerminalState(succeeded);
        }
      }));
    },
    onProgress: (progress) => {
      latestProcessingProgress = progress;
      processingProgressListeners.forEach((listener) => listener(progress));
    },
    harvestActivity: {
      pendingCount: harvestingQueue.pendingCount,
      subscribe: (listener) => { harvestActivityListeners.add(listener); return () => harvestActivityListeners.delete(listener); },
    },
  });

  const session: SharedReferenceModelSession = {
    itemId, prepared, resolveCandidateTreeNodeIds, cacheRevalidationResultByTreeNodeId, processingCompletion: processor.completion,
    subscribeStateChange: (listener) => { stateListeners.add(listener); return () => stateListeners.delete(listener); },
    subscribeProcessingProgress: (listener) => {
      processingProgressListeners.add(listener);
      if (latestProcessingProgress) listener(latestProcessingProgress);
      return () => processingProgressListeners.delete(listener);
    },
    subscribeHarvestProgress: (listener) => {
      harvestProgressListeners.add(listener);
      if (latestHarvestProgress) listener(latestHarvestProgress);
      return () => harvestProgressListeners.delete(listener);
    },
    dispose: () => {
      if (disposed) return;
      disposed = true;
      processor.dispose();
      harvestingQueue.dispose();
      stateListeners.clear();
      processingProgressListeners.clear();
      harvestProgressListeners.clear();
      harvestActivityListeners.clear();
      if (sessionsByWorkSessionId.get(workSession.id) === session) sessionsByWorkSessionId.delete(workSession.id);
    },
  };
  sessionsByWorkSessionId.set(workSession.id, session);
  return session;
}
