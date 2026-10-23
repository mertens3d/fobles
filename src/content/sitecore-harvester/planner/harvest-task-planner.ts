// @source-path [fobles] src/content/sitecore-harvester/planner/harvest-task-planner.ts

import { isGuidLike } from "../../features/augmentor/shared/guid";
import type { HarvestRequest, SitecoreHarvestFiltersState, SitecoreHarvestResult } from "../sitecore-harvester.types";
import type { SitecoreItemLocator, WorkerTask, WorkerTaskType } from "../../sitecore-worker/tasks/worker-task.types";

export type CollectorFilterKey = Exclude<keyof SitecoreHarvestFiltersState, "template">;
export type CollectorTaskType = Exclude<WorkerTaskType, "get-quick-info" | "set-raw-values" | "set-standard-fields">;

export type CollectorTaskPlan = {
  normalTasks: WorkerTask[];
  layoutTasks: WorkerTask[];
};

// "template" is a HarvestRequest filter, but it's not a collector task of its own - it only
// narrows the sections a get-custom-fields/get-standard-fields task returns, so it has no entry
// in COLLECTOR_TASK_TYPE_BY_FILTER_KEY.
export function isCollectorFilterKey(
  filterKey: keyof SitecoreHarvestFiltersState,
): filterKey is CollectorFilterKey {
  return filterKey !== "template";
}

// customFields and standardFields are two independent harvest crops, each read via its own
// atomic operation (both still happen to re-scan the same section DOM - see worker-task-executor).
export const COLLECTOR_TASK_TYPE_BY_FILTER_KEY: Readonly<Record<CollectorFilterKey, CollectorTaskType>> = {
  parent: "get-parent",
  children: "get-children",
  referrers: "get-referrers",
  customFields: "get-custom-fields",
  standardFields: "get-standard-fields",
  layouts: "get-layout",
};

// Reverse of COLLECTOR_TASK_TYPE_BY_FILTER_KEY - a Record already guarantees a 1:1 mapping now
// that customFields/standardFields are separate task types, so this is a plain one-entry-per-key
// map (kept as a Map, not grouped, since no task type is shared by two filter keys anymore).
export const FILTER_KEYS_BY_COLLECTOR_TASK_TYPE: ReadonlyMap<WorkerTaskType, CollectorFilterKey[]> = Array.from(
  Object.entries(COLLECTOR_TASK_TYPE_BY_FILTER_KEY) as Array<[CollectorFilterKey, WorkerTaskType]>,
).reduce((map, [filterKey, taskType]) => {
  map.set(taskType, [...(map.get(taskType) ?? []), filterKey]);
  return map;
}, new Map<WorkerTaskType, CollectorFilterKey[]>());

function createTask(request: HarvestRequest, type: CollectorTaskType): WorkerTask {
  return {
    requestId: request.requestId,
    taskId: crypto.randomUUID(),
    type,
    url: request.url,
  };
}

// The item reference the harvest's own url was built from (see buildFoblesUrl) - used as the
// "requested" locator for the harvest's get-quick-info task, so a root item whose url Sitecore
// can't resolve is reported as not-found instead of silently harvesting a fallback item's data.
function requestedLocatorFromUrl(url: string): SitecoreItemLocator | undefined {
  const reference = new URL(url).searchParams.get("fo") ?? undefined;

  return reference
    ? (isGuidLike(reference) ? { kind: "id", value: reference } : { kind: "path", value: reference })
    : undefined;
}

export function createGetQuickInfoTask(
  request: HarvestRequest,
  requested: SitecoreItemLocator,
): WorkerTask {
  return {
    requestId: request.requestId,
    taskId: crypto.randomUUID(),
    type: "get-quick-info",
    url: request.url,
    requested,
  };
}

function createEditorStateTask(
  request: HarvestRequest,
  type: "set-raw-values" | "set-standard-fields",
  value: boolean,
): WorkerTask {
  const url = new URL(request.url);
  url.searchParams.set("foblesEditorState", crypto.randomUUID());

  return {
    requestId: request.requestId,
    taskId: crypto.randomUUID(),
    type,
    url: url.toString(),
    value,
  };
}

export function createSetRawValuesTask(request: HarvestRequest, value: boolean): WorkerTask {
  return createEditorStateTask(request, "set-raw-values", value);
}

export function createSetStandardFieldsTask(request: HarvestRequest, value: boolean): WorkerTask {
  return createEditorStateTask(request, "set-standard-fields", value);
}

export function planCollectorTasks(request: HarvestRequest): WorkerTask[] {
  const tasks: WorkerTask[] = [];

  if (!request.existingResult) {
    const requested = requestedLocatorFromUrl(request.url);

    if (requested) tasks.push(createGetQuickInfoTask(request, requested));
  }

  for (const [taskType, filterKeys] of FILTER_KEYS_BY_COLLECTOR_TASK_TYPE) {
    const filterEnabled = filterKeys.some((filterKey) => request.filters[filterKey]);

    if (filterEnabled && !isCollectorResultAlreadyPresent(taskType, request.existingResult)) {
      tasks.push(createTask(request, taskType as CollectorTaskType));
    }
  }

  return tasks;
}

// Each section crop is read independently now, so "already present" is checked per crop instead
// of one combined check.
export function isCollectorResultAlreadyPresent(
  taskType: WorkerTaskType,
  existingResult: SitecoreHarvestResult | undefined,
): boolean {
  if (taskType === "get-custom-fields") return existingResult?.customFieldSections !== undefined;
  if (taskType === "get-standard-fields") return existingResult?.standardFieldSections !== undefined;

  return false;
}

export function planCollectorTaskGroups(request: HarvestRequest): CollectorTaskPlan {
  const normalTasks: WorkerTask[] = [];
  const layoutTasks: WorkerTask[] = [];

  for (const task of planCollectorTasks(request)) {
    if (task.type === "get-layout") layoutTasks.push(task);
    else normalTasks.push(task);
  }

  return { normalTasks, layoutTasks };
}