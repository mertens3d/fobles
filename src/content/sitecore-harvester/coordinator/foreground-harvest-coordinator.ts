// @source-path [fobles] src/content/sitecore-harvester/coordinator/foreground-harvest-coordinator.ts

import { extensionLog } from "../../logger";
import { HARVEST_STEPS } from "../harvest-steps";
import type {
  HarvestProgressCallback,
  HarvestRequest,
  ProgressStep,
  SitecoreHarvestResult,
} from "../sitecore-harvester.types";
import { cancelWorkerRequest, runWorkerTask } from "../worker-pool/worker-pool-client";
import {
  createErrorResult,
  isSuccessResult,
  type WorkerTask,
  type WorkerTaskResult,
  type WorkerTaskType,
} from "../worker-pool/worker-task.types";
import {
  buildEnrichItemTasks,
  collectItemGraphNodeDataGroups,
  mergeEnrichedItem,
} from "./enrichment-task-planner";
import { createBaseResult, extractRootItem, mergeCollectorResult } from "./harvest-result-merger";
import { FILTER_KEY_BY_COLLECTOR_TASK_TYPE, planCollectorTasks } from "./harvest-task-planner";

type HarvestOptions = {
  onProgress?: HarvestProgressCallback;
  signal?: AbortSignal;
};

const HARVEST_STEP_BY_FILTER_KEY = new Map(HARVEST_STEPS.map((step) => [step.filterKey, step] as const));

function stepForTaskType(type: WorkerTaskType): ProgressStep | undefined {
  const filterKey = FILTER_KEY_BY_COLLECTOR_TASK_TYPE.get(type);
  return filterKey ? HARVEST_STEP_BY_FILTER_KEY.get(filterKey) : undefined;
}

function reportSkippedSteps(request: HarvestRequest, onProgress: HarvestProgressCallback | undefined): void {
  for (const harvestStep of HARVEST_STEPS) {
    if (!request.filters[harvestStep.filterKey]) {
      onProgress?.(harvestStep, "skipped");
    }
  }
}

async function dispatchTasks(
  tasks: readonly WorkerTask[],
  onProgress: HarvestProgressCallback | undefined,
): Promise<WorkerTaskResult[]> {
  return await Promise.all(
    tasks.map(async (task): Promise<WorkerTaskResult> => {
      const step = stepForTaskType(task.type);
      if (step) {
        onProgress?.(step, "active");
      }

      const response = await runWorkerTask(task);
      const result = response ?? createErrorResult(task, "No response from worker pool");

      if (result.status === "error") {
        extensionLog.warn("Reference graph: collector task failed", { task, result });
      }

      if (step) {
        onProgress?.(step, result.status === "success" ? "complete" : "skipped");
      }

      return result;
    }),
  );
}

async function enrichResult(
  requestId: string,
  result: SitecoreHarvestResult,
  onProgress: HarvestProgressCallback | undefined,
): Promise<void> {
  const groups = collectItemGraphNodeDataGroups(result);
  const tasks = buildEnrichItemTasks(requestId, groups);

  onProgress?.({ stepKey: "enrichment", label: `Enriching Items (0/${tasks.length})` }, "active");

  let completed = 0;

  await Promise.all(
    tasks.map(async (task) => {
      const response = await runWorkerTask(task);
      completed += 1;

      onProgress?.(
        { stepKey: "enrichment", label: `Enriching Items (${completed}/${tasks.length})` },
        "active",
      );

      if (response?.status === "success" && response.type === "enrich-item") {
        const lookupKey = (task.lookup.scItemId || task.lookup.scItemPath)?.toLowerCase();
        if (lookupKey) {
          mergeEnrichedItem(groups, lookupKey, response.payload.item);
        }
      } else if (response?.status === "error") {
        extensionLog.warn("Reference graph: enrichment task failed", { task, response });
      }
    }),
  );

  extensionLog.debug("ENRICHED SITECORE HARVEST RESULT", result);

  onProgress?.({ stepKey: "enrichment", label: "Enriching Items" }, "complete");
}

// Single public entry point for both initial harvest and lazy-filter harvest (and reroot, which
// is just an initial harvest at a different url). The foreground owns the authoritative
// SitecoreHarvestResult, task scheduling, result merging, enrichment scheduling, progress, and
// cancellation - worker tabs only ever execute one WorkerTask and return one WorkerTaskResult.
export async function harvestSitecoreWithWorkers(
  request: HarvestRequest,
  options: HarvestOptions = {},
): Promise<SitecoreHarvestResult | undefined> {
  const { onProgress, signal } = options;

  const abortListener = (): void => cancelWorkerRequest(request.requestId);
  signal?.addEventListener("abort", abortListener);

  onProgress?.({ stepKey: "fetch-document", label: "Fetching Document" }, "active");
  onProgress?.({ stepKey: "parse-document", label: "Parsing Document" }, "active");
  reportSkippedSteps(request, onProgress);

  let result: SitecoreHarvestResult | undefined;

  try {
    const collectorTasks = planCollectorTasks(request);
    const collectorResults = await dispatchTasks(collectorTasks, onProgress);

    onProgress?.({ stepKey: "fetch-document", label: "Fetching Document" }, "complete");
    onProgress?.({ stepKey: "parse-document", label: "Parsing Document" }, "complete");

    if (signal?.aborted) {
      return undefined;
    }

    const successfulCollectorResults = collectorResults.filter(isSuccessResult);
    const rootItem = extractRootItem(request, successfulCollectorResults);

    if (!rootItem) {
      return undefined;
    }

    onProgress?.({ stepKey: "root-item", label: "Root Item" }, "complete");

    result = createBaseResult(request, rootItem);

    for (const collectorResult of successfulCollectorResults) {
      mergeCollectorResult(result, collectorResult);
    }

    if (signal?.aborted) {
      return undefined;
    }

    await enrichResult(request.requestId, result, onProgress);
  } finally {
    signal?.removeEventListener("abort", abortListener);
  }

  return signal?.aborted ? undefined : result;
}
