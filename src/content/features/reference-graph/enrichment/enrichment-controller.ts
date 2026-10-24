// @source-path [fobles] src/content/features/reference-graph/enrichment/enrichment-controller.ts

import type cytoscape from "cytoscape";
import { extensionLog } from "../../../logger";
import { createSitecoreItemLocator } from "../../../sitecore-harvester/worker-task-executor";
import { mergeEnrichedItem } from "../../../sitecore-harvester/planner/enrichment-task-planner";
import { cancelWorkerRequest, runWorkerTask } from "../../../sitecore-worker/pool/worker-pool-client";
import { createErrorResult, type WorkerTask, type WorkerTaskExecutionResult } from "../../../sitecore-worker/tasks/worker-task.types";
import { buildFoblesUrl } from "../../augmentor/helper";
import { resolveSitecoreDataIdentity } from "../../../sitecore-data/sitecore-data-identity";
import { enqueueHarvest } from "../lifecycle/active-harvest-queue";
import { resolveItemFact, type ResolveOutcome } from "../lifecycle/resolve-fact";
import { collectEnrichmentGuidLookup } from "./resolve-candidate-collector";
import type { DataTreeNode } from "../data-tree/data-tree.types";
import { setProcessingState, type ProcessingStateByTreeNodeId, type ProcessingStatus } from "../lifecycle/processing-state";
import { sortGuidsByEnrichmentPriority } from "./enrichment-priority";
import { patchCytoscapeNodes } from "./enrichment-graph-patcher";
import { firstItemNode, itemsFor } from "./enrichment-tree-state";
import type { EnrichmentController, EnrichmentProgressCallback } from "./enrichment.types";

type StartEnrichmentControllerOptions = {
  doc: Document;
  dataTree: DataTreeNode;
  nodesById: Map<string, DataTreeNode>;
  getCy: () => cytoscape.Core | undefined;
  processingStateByTreeNodeId: ProcessingStateByTreeNodeId;
  onProgress?: EnrichmentProgressCallback;
};

let activeController: EnrichmentController | undefined;

export function disposeActiveEnrichmentController(): void {
  activeController?.dispose();
  activeController = undefined;
}

export function startEnrichmentController({
  doc,
  dataTree,
  nodesById,
  getCy,
  processingStateByTreeNodeId,
  onProgress,
}: StartEnrichmentControllerOptions): EnrichmentController {
  disposeActiveEnrichmentController();

  let disposed = false;
  const requestId = crypto.randomUUID();
  const identity = resolveSitecoreDataIdentity(doc);
  const guidLookup = collectEnrichmentGuidLookup(dataTree);
  const guids = sortGuidsByEnrichmentPriority(Array.from(guidLookup.keys()), guidLookup, nodesById);
  const maxItemCount = guids.length;

  const controller: EnrichmentController = {
    dispose: () => {
      if (!disposed) {
        disposed = true;
        cancelWorkerRequest(requestId);
      }
    },
  };

  activeController = controller;

  setProcessingState(guids.flatMap((guid) => guidLookup.get(guid) ?? []), processingStateByTreeNodeId, "pending");

  patchCytoscapeNodes(
    getCy(),
    guids.flatMap((guid) => guidLookup.get(guid) ?? []),
    nodesById,
    processingStateByTreeNodeId,
  );

  reportProgress(0, maxItemCount, maxItemCount > 0 ? "running" : "complete");

  void runConcurrently();

  async function runConcurrently(): Promise<void> {
    let completedItemCount = 0;

    await Promise.all(
      guids.map(async (guid) => {
        if (!disposed) {
          await enrichOneGuid(guid);

          if (!disposed) {
            completedItemCount += 1;

            reportProgress(completedItemCount, maxItemCount, "running");
          }
        }
      }),
    );

    if (!disposed) {
      reportProgress(completedItemCount, maxItemCount, "complete");
    }
  }

  async function enrichOneGuid(guid: string): Promise<void> {
    const treeNodeIds = guidLookup.get(guid) ?? [];

    setProcessingState(treeNodeIds, processingStateByTreeNodeId, "enriching");

    patchCytoscapeNodes(getCy(), treeNodeIds, nodesById, processingStateByTreeNodeId);

    const representative = firstItemNode(treeNodeIds, nodesById);

    const reference = representative?.scItem.scItemId || representative?.scItem.scItemPath;

    let status: ProcessingStatus = "failed";

    if (representative && reference) {
      const outcome = await resolveItemFact(
        { ...identity, item: createSitecoreItemLocator(reference) },
        () => requestResolve(reference),
      );

      if (!disposed) {
        status = applyResolveOutcome(guid, treeNodeIds, outcome);

        extensionLog.debug("Reference graph resolve: outcome", { guid, reference, outcome: outcome.kind });

        // Only a past-root referenced item carries structural cache to go stale - current graph
        // semantics never full-harvest a referenced item merely because it was discovered here.
        if (outcome.kind === "stale" && outcome.hadStructuralCache) {
          extensionLog.debug("Reference graph resolve: queueing re-harvest", { reference });

          enqueueHarvest(reference, (succeeded) => {
            if (!disposed) {
              setProcessingState(treeNodeIds, processingStateByTreeNodeId, succeeded ? "enriched" : "failed");
              patchCytoscapeNodes(getCy(), treeNodeIds, nodesById, processingStateByTreeNodeId);
            }
          });
        }
      }
    }

    if (!disposed) {
      setProcessingState(treeNodeIds, processingStateByTreeNodeId, status);

      patchCytoscapeNodes(getCy(), treeNodeIds, nodesById, processingStateByTreeNodeId);
    }
  }

  async function requestResolve(reference: string): Promise<WorkerTaskExecutionResult> {
    const task: WorkerTask = {
      requestId,
      taskId: crypto.randomUUID(),
      type: "get-quick-info",
      url: buildFoblesUrl(reference),
      requested: createSitecoreItemLocator(reference),
    };

    try {
      const result = await runWorkerTask(task);
      return result ?? createErrorResult(task, "No response from worker pool");
    } catch (error) {
      if (!disposed) {
        extensionLog.warn("Reference graph: incremental resolve task failed", { task, error });
      }

      return createErrorResult(task, error instanceof Error ? error.message : "Resolve task failed");
    }
  }

  function applyResolveOutcome(
    guid: string,
    treeNodeIds: string[],
    outcome: ResolveOutcome,
  ): ProcessingStatus {
    if (outcome.kind === "not-found" || outcome.kind === "failed") {
      return outcome.kind;
    }

    const items = itemsFor(treeNodeIds, nodesById);
    mergeEnrichedItem(new Map([[guid, items]]), guid, outcome.value);

    return outcome.kind;
  }

  function reportProgress(completedItemCount: number, totalItemCount: number, status: "running" | "complete"): void {
    onProgress?.({ completedItemCount, maxItemCount: totalItemCount, status });
  }

  return controller;
}
