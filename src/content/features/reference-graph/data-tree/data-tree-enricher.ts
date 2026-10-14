// @source-path [fobles] src/content/features/reference-graph/data-tree/data-tree-enricher.ts

import { extensionLog } from "../../../logger";
import {
  buildEnrichItemTasks,
  collectItemGraphNodeDataGroups,
  mergeEnrichedItem,
} from "../../../sitecore-harvester/coordinator/enrichment-task-planner";
import type {
  HarvestProgressCallback,
} from "../../../sitecore-harvester/sitecore-harvester.types";
import {
  cancelWorkerRequest,
  runWorkerTask,
} from "../../../sitecore-harvester/worker-pool/worker-pool-client";
import type {
  DataTreeNode,
} from "./data-tree.types";

type EnrichDataTreeOptions = {
  signal?: AbortSignal;
  onProgress?: HarvestProgressCallback;
};

export async function enrichDataTree(
  dataTree: DataTreeNode,
  {
    signal,
    onProgress,
  }: EnrichDataTreeOptions = {},
): Promise<void> {
  const requestId =
    crypto.randomUUID();

  const abortListener =
    (): void => {
      cancelWorkerRequest(
        requestId,
      );
    };

  signal?.addEventListener(
    "abort",
    abortListener,
  );

  try {
    const groups =
      collectItemGraphNodeDataGroups(
        dataTree,
      );

    const tasks =
      buildEnrichItemTasks(
        requestId,
        groups,
      );

    onProgress?.(
      {
        stepKey: "enrichment",
        label:
          `Enriching Items (0/${tasks.length})`,
      },
      "active",
    );

    let completed = 0;

    await Promise.all(
      tasks.map(
        async (task): Promise<void> => {
          if (!signal?.aborted) {
            const response =
              await runWorkerTask(
                task,
              );

            completed += 1;

            onProgress?.(
              {
                stepKey: "enrichment",
                label:
                  `Enriching Items (${completed}/${tasks.length})`,
              },
              "active",
            );

            if (
              response?.status ===
                "success" &&
              response.type ===
                "enrich-item"
            ) {
              const lookupKey =
                (
                  task.lookup.scItemId ||
                  task.lookup.scItemPath
                )?.toLowerCase();

              if (lookupKey) {
                mergeEnrichedItem(
                  groups,
                  lookupKey,
                  response.payload.item,
                );
              }
            } else if (
              response?.status ===
              "error"
            ) {
              extensionLog.warn(
                "Reference graph: data-tree enrichment task failed",
                {
                  task,
                  response,
                },
              );
            }
          }
        },
      ),
    );

    if (!signal?.aborted) {
      onProgress?.(
        {
          stepKey: "enrichment",
          label: "Enriching Items",
        },
        "complete",
      );

      extensionLog.debug(
        "Reference graph: data tree enriched",
        {
          requestId,
          taskCount:
            tasks.length,
        },
      );
    }
  } finally {
    signal?.removeEventListener(
      "abort",
      abortListener,
    );
  }
}