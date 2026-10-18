// @source-path [fobles] src/content/sitecore-harvester/coordinator/harvest-task-planner.ts

import type { HarvestRequest, SitecoreHarvestFiltersState } from "../sitecore-harvester.types";
import type { WorkerEditorState, WorkerTask, WorkerTaskType } from "../worker-pool/worker-task.types";

export type CollectorFilterKey = Exclude<keyof SitecoreHarvestFiltersState, "template">;
type CollectorTaskType = Exclude<WorkerTaskType, "enrich-item" | "collect-root-item" | "set-editor-state">;

export type CollectorTaskPlan = {
  normalTasks: WorkerTask[];
  layoutTasks: WorkerTask[];
};

export const COLLECTOR_TASK_TYPE_BY_FILTER_KEY: Readonly<Record<CollectorFilterKey, CollectorTaskType>> = {
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

  for (const filterKey of Object.keys(COLLECTOR_TASK_TYPE_BY_FILTER_KEY) as CollectorFilterKey[]) {
    if (request.filters[filterKey]) tasks.push(createTask(request, COLLECTOR_TASK_TYPE_BY_FILTER_KEY[filterKey]));
  }

  return tasks;
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