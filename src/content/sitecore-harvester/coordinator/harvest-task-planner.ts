// @source-path [fobles] src/content/sitecore-harvester/coordinator/harvest-task-planner.ts

import type { HarvestRequest, SitecoreHarvestFiltersState } from "../sitecore-harvester.types";
import type { WorkerTask, WorkerTaskType } from "../worker-pool/worker-task.types";

export type CollectorFilterKey = Exclude<keyof SitecoreHarvestFiltersState, "template">;

// Centralized mapping from filter key to the worker task type that collects it - the one place
// that knows "parent -> collect-parent", "children -> collect-children", etc. HarvestResultMerger
// mirrors this same mapping on the way back in (worker task type -> SitecoreHarvestResult field).
export const COLLECTOR_TASK_TYPE_BY_FILTER_KEY: Readonly<Record<CollectorFilterKey, Exclude<WorkerTaskType, "enrich-item" | "collect-root-item">>> = {
  parent: "collect-parent",
  children: "collect-children",
  referrers: "collect-referrers",
  sections: "collect-sections",
  layouts: "collect-layouts",
};

export const FILTER_KEY_BY_COLLECTOR_TASK_TYPE: ReadonlyMap<WorkerTaskType, CollectorFilterKey> = new Map(
  (Object.entries(COLLECTOR_TASK_TYPE_BY_FILTER_KEY) as Array<[CollectorFilterKey, WorkerTaskType]>).map(
    ([filterKey, taskType]) => [taskType, filterKey] as const,
  ),
);

function createTask(
  request: HarvestRequest,
  type: Exclude<WorkerTaskType, "enrich-item">,
): WorkerTask {
  return {
    requestId: request.requestId,
    taskId: crypto.randomUUID(),
    type,
    url: request.url,
  };
}

// Initial harvest (no existingResult) always needs a fresh root item; lazy-filter harvest
// (existingResult supplied) reuses existingResult.rootItem instead, so no root-item task is
// planned - this is also what keeps "request only the newly enabled filter" true: only the
// requested filter keys produce tasks, nothing else is re-collected.
export function planCollectorTasks(request: HarvestRequest): WorkerTask[] {
  const tasks: WorkerTask[] = [];

  if (!request.existingResult) {
    tasks.push(createTask(request, "collect-root-item"));
  }

  for (const filterKey of Object.keys(COLLECTOR_TASK_TYPE_BY_FILTER_KEY) as CollectorFilterKey[]) {
    if (request.filters[filterKey]) {
      tasks.push(createTask(request, COLLECTOR_TASK_TYPE_BY_FILTER_KEY[filterKey]));
    }
  }

  return tasks;
}
