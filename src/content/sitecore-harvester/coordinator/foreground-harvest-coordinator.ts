// @source-path [fobles] src/content/sitecore-harvester/coordinator/foreground-harvest-coordinator.ts

import { HARVEST_STEPS } from "../planner/harvest-steps";
import type { HarvestProgressCallback, HarvestRequest, SitecoreHarvestResult } from "../sitecore-harvester.types";
import { cancelWorkerRequest } from "../../foundation/workers/pool/worker-pool-client";
import { isSuccessResult, type WorkerTaskResult } from "../../foundation/workers/tasks/worker-task.types";
import { executeHarvestPlan } from "./harvest-plan-executor";
import { COLLECTOR_TASK_TYPE_BY_FILTER_KEY, isCollectorFilterKey, isCollectorResultAlreadyPresent } from "../planner/harvest-task-planner";
import { createBaseResult, extractRootItem, mergeCollectorResult } from "./harvest-result-merger";

type HarvestOptions = {
  onProgress?: HarvestProgressCallback;
  signal?: AbortSignal;
};

function reportSkippedSteps(request: HarvestRequest, onProgress: HarvestProgressCallback | undefined): void {
  for (const step of HARVEST_STEPS) {
    const enabledFilterKeys = step.filterKeys.filter((filterKey) => request.filters[filterKey]);

    if (enabledFilterKeys.length === 0) {
      onProgress?.(step, "skipped");
    } else if (
      enabledFilterKeys
        .filter(isCollectorFilterKey)
        .every((filterKey) =>
          isCollectorResultAlreadyPresent(COLLECTOR_TASK_TYPE_BY_FILTER_KEY[filterKey], request.existingResult),
        )
    ) {
      onProgress?.(step, "complete");
    }
  }
}

function createHarvestResult(
  request: HarvestRequest,
  collectorResults: readonly WorkerTaskResult[],
  onProgress: HarvestProgressCallback | undefined,
): SitecoreHarvestResult | undefined {
  const successfulResults = collectorResults.filter(isSuccessResult);
  const rootItem = extractRootItem(request, successfulResults);
  if (!rootItem) return undefined;

  onProgress?.({ stepKey: "root-item", label: "Root Item" }, "complete");

  const result = createBaseResult(request, rootItem);
  for (const collectorResult of successfulResults) mergeCollectorResult(result, collectorResult);
  return result;
}

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

  try {
    const collectorResults = await executeHarvestPlan(request, onProgress);

    onProgress?.({ stepKey: "fetch-document", label: "Fetching Document" }, "complete");
    onProgress?.({ stepKey: "parse-document", label: "Parsing Document" }, "complete");

    return signal?.aborted
      ? undefined
      : createHarvestResult(request, collectorResults, onProgress);
  } finally {
    signal?.removeEventListener("abort", abortListener);
  }
}