import type { HarvestOptions } from "./coordinator.types.js";
// @source-path [fobles] src/content/foundation/harvesting/coordinator/foreground-harvest-coordinator.ts

import { HARVEST_STEPS } from "../planner/harvest-steps";
import type { HarvestRequest } from "../harvesting.types.js";
import type { HarvestProgressCallback } from "../harvesting.types.js";
import type { SitecoreHarvestResult } from "../harvesting.types.js";
import { cancelWorkerRequest } from "../../workers/pool/worker-pool-client";
import { isSuccessResult } from "../../workers/tasks/worker-task.js";
import type { WorkerTaskResult } from "../../workers/tasks/tasks.types.js";
import { executeHarvestPlan } from "./harvest-plan-executor";
import { isCollectorFilterKey, isCollectorResultAlreadyPresent } from "../planner/harvest-task-planner";
import { COLLECTOR_TASK_TYPE_BY_FILTER_KEY } from "../planner/planner.const";
import { createBaseResult, extractRootItem, mergeCollectorResult } from "./harvest-result-merger";

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
  if (!rootItem) {
    return undefined;
  }

  onProgress?.({ stepKey: "root-item", label: "Root Item" }, "complete");

  const result = createBaseResult(request, rootItem);
  for (const collectorResult of successfulResults) {
    mergeCollectorResult(result, collectorResult);
  }
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

    return signal?.aborted ? undefined : createHarvestResult(request, collectorResults, onProgress);
  } finally {
    signal?.removeEventListener("abort", abortListener);
  }
}
