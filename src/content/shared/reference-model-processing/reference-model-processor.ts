// @source-path [fobles] src/content/shared/reference-model-processing/reference-model-processor.ts
import { extensionLog } from "../../logger";
import type { HealthReport } from "../../shell/health/health.types";
import { resolveSitecoreDataIdentity } from "../../sitecore-data/sitecore-data-identity";
import { mergeEnrichedItem } from "../../foundation/harvesting/planner/enrichment-task-planner";
import { createSitecoreItemLocator } from "../../foundation/harvesting/worker-task-executor";
import { createErrorResult, type WorkerTask, type WorkerTaskExecutionResult } from "../../foundation/workers/tasks/worker-task.types";
import type { WorkSession } from "../../shell/work-session/work-session.types";
import { buildFoblesUrl } from "../../features/augmentor/helper";
import type { ReferenceModelNode } from "../../features/reference-model/reference-model.types";
import { collectEnrichmentGuidLookup, isEligibleForResolve } from "./resolve-candidate-collector";
import { sortGuidsByEnrichmentPriority } from "./reference-model-processing-priority";
import { firstItemNode, itemsFor } from "./reference-model-processing-tree-state";
import type { ReferenceModelProcessingController, ReferenceModelProcessingProgress, ReferenceModelProcessingStateChange } from "./reference-model-processing.types";
import { setProcessingState, type ProcessingStateByTreeNodeId, type ProcessingStatus } from "./processing-state";
import { resolveItemFact, type ResolveOutcome } from "./resolve-fact";
type StartReferenceModelProcessorOptions = { doc: Document; workSession: WorkSession; referenceModel: ReferenceModelNode; nodesById: Map<string, ReferenceModelNode>; processingStateByTreeNodeId: ProcessingStateByTreeNodeId; onStateChange?: ReferenceModelProcessingStateChange; onStaleStructural?: (reference: string, treeNodeIds: readonly string[], setTerminalState: (succeeded: boolean) => void) => void; onProgress?: (progress: ReferenceModelProcessingProgress) => void; };
const NON_TERMINAL_STATUSES = new Set<ProcessingStatus | undefined>([undefined, "pending", "enriching"]);
export function startReferenceModelProcessor({ doc, workSession, referenceModel, nodesById, processingStateByTreeNodeId, onStateChange, onStaleStructural, onProgress }: StartReferenceModelProcessorOptions): ReferenceModelProcessingController {
  let disposed = false;
  let lastProgressAt = performance.now();
  let completedItemCount = 0;
  const activeGuids = new Set<string>();
  const identity = resolveSitecoreDataIdentity(doc);
  const guidLookup = collectEnrichmentGuidLookup(referenceModel);
  const guids = sortGuidsByEnrichmentPriority(Array.from(guidLookup.keys()), guidLookup, nodesById);
  const candidateTreeNodeIds = guids.flatMap((guid) => guidLookup.get(guid) ?? []);
  const guidByTreeNodeId = new Map<string, string>();
  guidLookup.forEach((treeNodeIds, guid) => treeNodeIds.forEach((treeNodeId) => guidByTreeNodeId.set(treeNodeId, guid)));
  const maxItemCount = guids.length;
  extensionLog.debug("Reference model processor diagnostic: candidates discovered", { workSessionId: workSession.id, candidateGuidCount: guids.length, candidateTreeNodeCount: candidateTreeNodeIds.length, candidates: guids.map((guid) => ({ guid, treeNodeIds: guidLookup.get(guid) ?? [] })) });
  function getHealth(): HealthReport {
    const checkedAt = performance.now();
    const noProgressMs = Math.round(checkedAt - lastProgressAt);
    const degraded = !disposed && activeGuids.size > 0 && noProgressMs >= 20000;

    return {
      owner: "ReferenceModelProcessor",
      state: degraded ? "degraded" : "healthy",
      checkedAt,
      lastProgressAt,
      noProgressMs,
      reason: degraded ? "Resolve candidates are waiting for worker recovery or terminal job results" : undefined,
      activeCount: activeGuids.size,
      recoveryCount: 0,
    };
  }
  const unregisterHealth = workSession.registerHealthProvider({ getHealth });
  async function publish(treeNodeIds: readonly string[], status: ProcessingStatus): Promise<void> {
    setProcessingState(treeNodeIds, processingStateByTreeNodeId, status); lastProgressAt = performance.now(); workSession.markProgress(`processor-state:${status}`);
    extensionLog.debug("Reference model processor diagnostic: state published", { workSessionId: workSession.id, status, treeNodeIds, storedStates: treeNodeIds.map((treeNodeId) => ({ treeNodeId, guid: guidByTreeNodeId.get(treeNodeId), processingStatus: processingStateByTreeNodeId.get(treeNodeId) })) });
    await onStateChange?.(treeNodeIds, status, processingStateByTreeNodeId);
  }
  void publish(candidateTreeNodeIds, "pending");
  onProgress?.({ completedItemCount: 0, maxItemCount, status: maxItemCount > 0 ? "running" : "complete" });
  const completion = runConcurrently();
  async function runConcurrently(): Promise<void> {
    completedItemCount = 0;
    await Promise.all(guids.map(async (guid) => {
      if (disposed || workSession.signal.aborted) return;
      activeGuids.add(guid);
      try { await processOneGuid(guid); } finally { activeGuids.delete(guid); lastProgressAt = performance.now(); }
      if (!disposed && !workSession.signal.aborted) { completedItemCount += 1; onProgress?.({ completedItemCount, maxItemCount, status: "running" }); }
    }));
    const nonTerminal = candidateTreeNodeIds.map((treeNodeId) => ({ treeNodeId, guid: guidByTreeNodeId.get(treeNodeId), processingStatus: processingStateByTreeNodeId.get(treeNodeId) })).filter(({ processingStatus }) => NON_TERMINAL_STATUSES.has(processingStatus));
    extensionLog.debug("Reference model processor diagnostic: completion invariant", { workSessionId: workSession.id, candidateGuidCount: guids.length, candidateTreeNodeCount: candidateTreeNodeIds.length, completedItemCount, nonTerminalCount: nonTerminal.length, nonTerminal });
    if (!disposed && !workSession.signal.aborted) onProgress?.({ completedItemCount, maxItemCount, status: "complete" });
  }
  async function processOneGuid(guid: string): Promise<void> {
    const treeNodeIds = guidLookup.get(guid) ?? [];

    if (!isEligibleForResolve(treeNodeIds, nodesById)) {
      await publish(treeNodeIds, "enriched");
      return;
    }

    await publish(treeNodeIds, "enriching");

    const representative = firstItemNode(treeNodeIds, nodesById);
    const reference = representative?.scItem.scItemId || representative?.scItem.scItemPath;
    let status: ProcessingStatus = "failed";

    try {
      if (representative && reference) {
        const outcome = await resolveItemFact(
          { ...identity, item: createSitecoreItemLocator(reference) },
          () => requestResolve(reference),
        );

        if (!disposed && !workSession.signal.aborted) {
          status = applyResolveOutcome(guid, treeNodeIds, outcome);
          extensionLog.debug("Reference model processor: resolve outcome", {
            guid,
            reference,
            outcome: outcome.kind,
            terminalStatus: status,
            treeNodeIds,
          });

          if (outcome.kind === "stale" && outcome.hadStructuralCache) {
            onStaleStructural?.(reference, treeNodeIds, (succeeded) => {
              if (!disposed && !workSession.signal.aborted) {
                void publish(treeNodeIds, succeeded ? "enriched" : "failed");
              }
            });
          }
        }
      }
    } catch (error) {
      status = "failed";
      extensionLog.warn("Reference model processor: candidate became unable to process", {
        guid,
        reference,
        treeNodeIds,
        error,
      });
    } finally {
      if (!disposed && !workSession.signal.aborted) {
        await publish(treeNodeIds, status);
      }
    }
  }

  async function requestResolve(reference: string): Promise<WorkerTaskExecutionResult> {
    const task: Omit<Extract<WorkerTask, { type: "get-quick-info" }>, "requestId"> = { taskId: crypto.randomUUID(), type: "get-quick-info", url: buildFoblesUrl(reference), requested: createSitecoreItemLocator(reference) };
    try { const result = await workSession.runTask(task); return result ?? createErrorResult({ ...task, requestId: workSession.id }, "No response from worker pool"); }
    catch (error) { if (!disposed) extensionLog.warn("Reference model processor: resolve task failed", { task, error }); return createErrorResult({ ...task, requestId: workSession.id }, error instanceof Error ? error.message : "Resolve task failed"); }
  }
  function applyResolveOutcome(guid: string, treeNodeIds: string[], outcome: ResolveOutcome): ProcessingStatus {
    if (outcome.kind === "not-found" || outcome.kind === "failed") return outcome.kind;
    mergeEnrichedItem(new Map([[guid, itemsFor(treeNodeIds, nodesById)]]), guid, outcome.value);
    return outcome.kind;
  }
  return { completion, getHealth, dispose: () => { disposed = true; activeGuids.clear(); unregisterHealth(); } };
}
