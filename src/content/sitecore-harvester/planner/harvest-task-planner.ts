// @source-path [fobles] src/content/sitecore-harvester/planner/harvest-task-planner.ts

import type { HarvestRequest, SitecoreHarvestFiltersState, SitecoreHarvestResult } from "../sitecore-harvester.types";
import type { WorkerEditorState, WorkerTask, WorkerTaskType } from "../../sitecore-worker/tasks/worker-task.types";

export type CollectorFilterKey = Exclude<keyof SitecoreHarvestFiltersState, "template">;
export type CollectorTaskType = Exclude<WorkerTaskType, "enrich-item" | "collect-root-item" | "set-editor-state">;

export type CollectorTaskPlan = {
  normalTasks: WorkerTask[];
  layoutTasks: WorkerTask[];
};

// fields and standardFields are two independent harvest crops produced by the SAME single DOM
// pass (collect-sections) - either filter being on is enough to need that task.
export const COLLECTOR_TASK_TYPE_BY_FILTER_KEY: Readonly<Record<CollectorFilterKey, CollectorTaskType>> = {
  parent: "collect-parent",
  children: "collect-children",
  referrers: "collect-referrers",
  customFields: "collect-sections",
  standardFields: "collect-sections",
  layouts: "collect-layouts",
};

// Reverse of COLLECTOR_TASK_TYPE_BY_FILTER_KEY, grouped since collect-sections is gated by two
// filter keys (fields, standardFields) - used for progress-step skip detection.
export const FILTER_KEYS_BY_COLLECTOR_TASK_TYPE: ReadonlyMap<WorkerTaskType, CollectorFilterKey[]> = Array.from(
  Object.entries(COLLECTOR_TASK_TYPE_BY_FILTER_KEY) as Array<[CollectorFilterKey, WorkerTaskType]>,
).reduce((map, [filterKey, taskType]) => {
  map.set(taskType, [...(map.get(taskType) ?? []), filterKey]);
  return map;
}, new Map<WorkerTaskType, CollectorFilterKey[]>());

function createTask(request: HarvestRequest, type: Exclude<WorkerTaskType, "enrich-item" | "set-editor-state">): WorkerTask {
  return {
    requestId: request.requestId,
    taskId: crypto.randomUUID(),
    type,
    url: request.url,
  };
}

export function createEditorStateTask(
  request: HarvestRequest,
  editorState: WorkerEditorState,
): WorkerTask {
  const url = new URL(request.url);
  url.searchParams.set("foblesEditorState", crypto.randomUUID());

  return {
    requestId: request.requestId,
    taskId: crypto.randomUUID(),
    type: "set-editor-state",
    url: url.toString(),
    editorState,
  };
}

export function planCollectorTasks(request: HarvestRequest): WorkerTask[] {
  const tasks: WorkerTask[] = [];

  if (!request.existingResult) tasks.push(createTask(request, "collect-root-item"));

  for (const [taskType, filterKeys] of FILTER_KEYS_BY_COLLECTOR_TASK_TYPE) {
    const filterEnabled = filterKeys.some((filterKey) => request.filters[filterKey]);

    if (filterEnabled && !isCollectorResultAlreadyPresent(taskType, request.existingResult)) {
      tasks.push(createTask(request, taskType as CollectorTaskType));
    }
  }

  return tasks;
}

// collect-sections always sets customFieldSections and standardFieldSections together in one DOM
// pass, so once either crop has been harvested there's nothing left for a re-run to add - e.g.
// enabling Standard Fields after Custom Fields was already harvested needs no new worker task.
export function isCollectorResultAlreadyPresent(
  taskType: WorkerTaskType,
  existingResult: SitecoreHarvestResult | undefined,
): boolean {
  return taskType === "collect-sections" && existingResult?.customFieldSections !== undefined;
}

export function planCollectorTaskGroups(request: HarvestRequest): CollectorTaskPlan {
  const normalTasks: WorkerTask[] = [];
  const layoutTasks: WorkerTask[] = [];

  for (const task of planCollectorTasks(request)) {
    if (task.type === "collect-layouts") layoutTasks.push(task);
    else normalTasks.push(task);
  }

  return { normalTasks, layoutTasks };
}