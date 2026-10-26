// @source-path [fobles] src/content/foundation/reference-data/processing/reference-model-session.ts
import { extensionLog } from "../../../logger";
import { buildFoblesUrl } from "../../../features/augmentor/helper";
import { harvestSitecoreWithWorkers } from "../../harvesting/coordinator/foreground-harvest-coordinator";
import type { HarvestProgressCallback, SitecoreHarvestFiltersState } from "../../harvesting/sitecore-harvester.types";
import type { SitecoreHarvestResult } from "../../harvesting/sitecore-harvester.types";
import type { WorkSession } from "../../../shell/work-session/work-session.types";
import { acquireReferenceModelForCurrentItem } from "../../../features/reference-graph/lifecycle/acquire-reference-model";
import type { PreparedReferenceGraph } from "../../../features/reference-graph/prepared-reference-graph.types";
import { collectEnrichmentGuidLookup } from "./resolve-candidate-collector";
import { createReferenceModelHarvestQueue, type ReferenceModelHarvestQueue, type ReferenceModelHarvestProgress } from "./reference-model-harvest-queue";
import { startReferenceModelProcessor } from "./reference-model-processor";
import type { ReferenceModelProcessingController, ReferenceModelProcessingProgress } from "./reference-model-processing.types";
import type { ProcessingStateByTreeNodeId, ProcessingStatus } from "./processing-state";
export type ReferenceModelSessionStateChange = (treeNodeIds: readonly string[], status: ProcessingStatus, state: ProcessingStateByTreeNodeId) => void | Promise<void>;
export type SharedReferenceModelSession = {
  itemId: string;
  prepared: PreparedReferenceGraph;
  resolveCandidateTreeNodeIds: ReadonlySet<string>;
  cacheRevalidationResultByTreeNodeId: ReadonlyMap<string, "passed" | "error">;
  processingCompletion: Promise<void>;
  subscribeStateChange: (listener: ReferenceModelSessionStateChange) => () => void;
  subscribeProcessingProgress: (listener: (progress: ReferenceModelProcessingProgress) => void) => () => void;
  subscribeHarvestProgress: (listener: (progress: ReferenceModelHarvestProgress) => void) => () => void;
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
};
const sessionsByWorkSessionId = new Map<string, SharedReferenceModelSession>();
export function getSharedReferenceModelSession(workSessionId: string): SharedReferenceModelSession | undefined { return sessionsByWorkSessionId.get(workSessionId); }
export async function startSharedReferenceModelSession({ doc, workSession, filters, signal, onAcquireProgress, onHarvestRequired, onRootRefresh }: StartSharedReferenceModelSessionOptions): Promise<SharedReferenceModelSession | undefined> {
  sessionsByWorkSessionId.get(workSession.id)?.dispose();
  const acquired = await acquireReferenceModelForCurrentItem(doc, filters, { signal, onProgress: onAcquireProgress, onHarvestRequired });
  if (!acquired || signal.aborted) return undefined;
  const { itemId, prepared, decision } = acquired;
  const stateListeners = new Set<ReferenceModelSessionStateChange>();
  const processingProgressListeners = new Set<(progress: ReferenceModelProcessingProgress) => void>();
  const harvestProgressListeners = new Set<(progress: ReferenceModelHarvestProgress) => void>();
  let latestProcessingProgress: ReferenceModelProcessingProgress | undefined;
  let latestHarvestProgress: ReferenceModelHarvestProgress | undefined;
  const cacheRevalidationResultByTreeNodeId = new Map<string, "passed" | "error">();
  const guidLookup = collectEnrichmentGuidLookup(prepared.referenceModel);
  const resolveCandidateTreeNodeIds = new Set<string>(Array.from(guidLookup.values()).flat());
  let disposed = false;
  const harvestQueue: ReferenceModelHarvestQueue = createReferenceModelHarvestQueue({
    runHarvest: async (reference: string, harvestSignal: AbortSignal) => {
      const result = await harvestSitecoreWithWorkers({ requestId: workSession.id, url: buildFoblesUrl(reference), filters }, { signal: harvestSignal });
      if (result) onRootRefresh?.(result);
    },
    onProgress: (progress: ReferenceModelHarvestProgress) => { latestHarvestProgress = progress; harvestProgressListeners.forEach((listener) => listener(progress)); },
    onError: (reference: string, error: unknown) => extensionLog.warn("Reference model session: stale re-harvest failed", { workSessionId: workSession.id, reference, error }),
  });
  const processor: ReferenceModelProcessingController = startReferenceModelProcessor({
    doc,
    workSession,
    referenceModel: prepared.referenceModel,
    nodesById: prepared.nodesById,
    processingStateByTreeNodeId: prepared.processingStateByTreeNodeId,
    onStateChange: async (treeNodeIds, status, state) => { for (const listener of stateListeners) await listener(treeNodeIds, status, state); },
    onStaleStructural: (reference, treeNodeIds, setTerminalState) => harvestQueue.enqueue(reference, (succeeded) => { treeNodeIds.forEach((treeNodeId) => cacheRevalidationResultByTreeNodeId.set(treeNodeId, succeeded ? "passed" : "error")); setTerminalState(succeeded); }),
    onProgress: (progress) => { latestProcessingProgress = progress; processingProgressListeners.forEach((listener) => listener(progress)); },
  });
  const session: SharedReferenceModelSession = {
    itemId,
    prepared,
    resolveCandidateTreeNodeIds,
    cacheRevalidationResultByTreeNodeId,
    processingCompletion: processor.completion,
    subscribeStateChange: (listener) => { stateListeners.add(listener); return () => stateListeners.delete(listener); },
    subscribeProcessingProgress: (listener) => { processingProgressListeners.add(listener); if (latestProcessingProgress) listener(latestProcessingProgress); return () => processingProgressListeners.delete(listener); },
    subscribeHarvestProgress: (listener) => { harvestProgressListeners.add(listener); if (latestHarvestProgress) listener(latestHarvestProgress); return () => harvestProgressListeners.delete(listener); },
    dispose: () => { if (disposed) return; disposed = true; processor.dispose(); harvestQueue.dispose(); stateListeners.clear(); processingProgressListeners.clear(); harvestProgressListeners.clear(); if (sessionsByWorkSessionId.get(workSession.id) === session) sessionsByWorkSessionId.delete(workSession.id); },
  };
  sessionsByWorkSessionId.set(workSession.id, session);
  if (decision.kind === "cache-then-reharvest") harvestQueue.enqueue(itemId);
  return session;
}
