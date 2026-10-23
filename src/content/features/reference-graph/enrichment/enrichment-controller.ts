// @source-path [fobles] src/content/features/reference-graph/enrichment/enrichment-controller.ts

import type cytoscape from "cytoscape";
import { extensionLog } from "../../../logger";
import { createSitecoreItemLocator } from "../../../sitecore-harvester/worker-task-executor";
import { mergeEnrichedItem } from "../../../sitecore-harvester/planner/enrichment-task-planner";
import { cancelWorkerRequest, runWorkerTask } from "../../../sitecore-worker/pool/worker-pool-client";
import type { WorkerTask, WorkerTaskResult } from "../../../sitecore-worker/tasks/worker-task.types";
import { buildFoblesUrl } from "../../augmentor/helper";
import { collectEnrichmentGuidLookup } from "../data-tree/data-tree-enrichment-lookup";
import type { DataTreeNode, EnrichmentStatus } from "../data-tree/data-tree.types";
import { sortGuidsByEnrichmentPriority } from "./enrichment-priority";
import { patchCytoscapeNodes } from "./enrichment-graph-patcher";
import { firstItemNode, itemsFor, markTreeNodes } from "./enrichment-tree-state";
import type { EnrichmentController, EnrichmentProgressCallback } from "./enrichment.types";

type StartEnrichmentControllerOptions = {
  dataTree: DataTreeNode;
  nodesById: Map<string, DataTreeNode>;
  getCy: () => cytoscape.Core | undefined;
  onProgress?: EnrichmentProgressCallback;
};

let activeController: EnrichmentController | undefined;

export function disposeActiveEnrichmentController(): void {
  activeController?.dispose();
  activeController = undefined;
}

export function startEnrichmentController({
  dataTree,
  nodesById,
  getCy,
  onProgress,
}: StartEnrichmentControllerOptions): EnrichmentController {
  disposeActiveEnrichmentController();

  let disposed = false;
  const requestId = crypto.randomUUID();
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

  markTreeNodes(guids, guidLookup, nodesById, "pending");

  patchCytoscapeNodes(
    getCy(),
    guids.flatMap((guid) => guidLookup.get(guid) ?? []),
    nodesById,
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

    markTreeNodes([guid], guidLookup, nodesById, "enriching");

    patchCytoscapeNodes(getCy(), treeNodeIds, nodesById);

    const representative = firstItemNode(treeNodeIds, nodesById);

    const reference = representative?.scItem.scItemId || representative?.scItem.scItemPath;

    let status: EnrichmentStatus = "failed";

    if (representative && reference) {
      const result = await requestEnrichment(reference);

      if (!disposed) {
        status = applyEnrichmentResult(guid, treeNodeIds, result);
      }
    }

    if (!disposed) {
      markTreeNodes([guid], guidLookup, nodesById, status);

      patchCytoscapeNodes(getCy(), treeNodeIds, nodesById);
    }
  }

  async function requestEnrichment(
    reference: string,
  ): Promise<WorkerTaskResult | undefined> {
    const task: WorkerTask = {
      requestId,
      taskId: crypto.randomUUID(),
      type: "get-quick-info",
      url: buildFoblesUrl(reference),
      requested: createSitecoreItemLocator(reference),
    };

    let result: WorkerTaskResult | undefined;

    try {
      result = await runWorkerTask(task);
    } catch (error) {
      if (!disposed) {
        extensionLog.warn("Reference graph: incremental enrichment task failed", { task, error });
      }
    }

    return result;
  }

  function applyEnrichmentResult(
    guid: string,
    treeNodeIds: string[],
    result: WorkerTaskResult | undefined,
  ): EnrichmentStatus {
    let status: EnrichmentStatus = "failed";

    if (result?.status === "success" && result.type === "get-quick-info") {
      const resolved = result.payload.result;

      if (resolved.status === "found" && resolved.value) {
        const items = itemsFor(treeNodeIds, nodesById);

        mergeEnrichedItem(new Map([[guid, items]]), guid, resolved.value);

        status = "enriched";
      } else {
        status = "not-found";
      }
    }

    return status;
  }

  function reportProgress(completedItemCount: number, totalItemCount: number, status: "running" | "complete"): void {
    onProgress?.({ completedItemCount, maxItemCount: totalItemCount, status });
  }

  return controller;
}
