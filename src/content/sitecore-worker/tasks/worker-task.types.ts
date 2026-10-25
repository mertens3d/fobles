// @source-path [fobles] src/content/sitecore-worker/tasks/worker-task.types.ts


import type { ItemGraphNodeData, SitecoreHarvestSection, LayoutSectionField } from "../../features/reference-model/sitecore-item.types";
import type { WorkerTarget } from "../pool/worker-target";

// An item reference as actually requested of Sitecore - as opposed to an ambiguous
// itemIdOrPath string, every item-oriented operation says explicitly which kind it means.
export type SitecoreItemLocator =
  | { kind: "id"; value: string }
  | { kind: "path"; value: string };

// Carries both what was asked for and what Sitecore actually resolved, so a caller can tell
// "found the right item" apart from "Sitecore silently fell back to a different item" (e.g. an
// unresolved GUID falling back to /sitecore/content/Home) - the latter is reported as
// "not-found" data, never as though the fallback item were the one requested. Navigation/
// timeout/parser failures remain WorkerTaskResult-level errors, not part of this type.
export type SitecoreResolvedResult<TValue> = {
  requested: SitecoreItemLocator;
  resolved?: { itemId: string; path?: string };
  value?: TValue;
  status: "found" | "not-found" | "error";
};

export type WorkerTaskType =
  | "get-quick-info"
  | "get-parent"
  | "get-children"
  | "get-referrers"
  | "get-custom-fields"
  | "get-standard-fields"
  | "get-layout"
  | "set-raw-values"
  | "set-standard-fields";

type WorkerTaskBase<TType extends WorkerTaskType> = {
  requestId: string;
  taskId: string;
  type: TType;
  // Page the worker must navigate to before executing this task.
  url: string;
};

export type GetQuickInfoTask = WorkerTaskBase<"get-quick-info"> & {
  requested: SitecoreItemLocator;
};
export type GetParentTask = WorkerTaskBase<"get-parent">;
export type GetChildrenTask = WorkerTaskBase<"get-children">;
export type GetReferrersTask = WorkerTaskBase<"get-referrers">;
export type GetCustomFieldsTask = WorkerTaskBase<"get-custom-fields">;
export type GetStandardFieldsTask = WorkerTaskBase<"get-standard-fields">;
export type GetLayoutTask = WorkerTaskBase<"get-layout">;
export type SetRawValuesTask = WorkerTaskBase<"set-raw-values"> & { value: boolean };
export type SetStandardFieldsTask = WorkerTaskBase<"set-standard-fields"> & { value: boolean };

export type WorkerTask =
  | GetQuickInfoTask
  | GetParentTask
  | GetChildrenTask
  | GetReferrersTask
  | GetCustomFieldsTask
  | GetStandardFieldsTask
  | GetLayoutTask
  | SetRawValuesTask
  | SetStandardFieldsTask;

export type WorkerTaskPayloadByType = {
  "get-quick-info": { result: SitecoreResolvedResult<ItemGraphNodeData>; revision?: string };
  "get-parent": { parent: ItemGraphNodeData | undefined };
  "get-children": { childItems: readonly ItemGraphNodeData[] };
  "get-referrers": { referrers: readonly ItemGraphNodeData[] };
  "get-custom-fields": { sections: readonly SitecoreHarvestSection[] };
  "get-standard-fields": { sections: readonly SitecoreHarvestSection[] };
  "get-layout": { layoutSectionFields: readonly LayoutSectionField[] };
  "set-raw-values": { value: boolean };
  "set-standard-fields": { value: boolean };
};

type WorkerTaskResultBase<TType extends WorkerTaskType> = {
  requestId: string;
  taskId: string;
  type: TType;
};

type WorkerTaskSuccessResultFor<TType extends WorkerTaskType> =
  WorkerTaskResultBase<TType> & {
    status: "success";
    payload: WorkerTaskPayloadByType[TType];
  };

// Distributing the mapped type over WorkerTaskType builds a true discriminated union.
export type WorkerTaskSuccessResult =
  { [TType in WorkerTaskType]: WorkerTaskSuccessResultFor<TType> }[WorkerTaskType];

export type WorkerTaskErrorResult =
  { [TType in WorkerTaskType]: WorkerTaskResultBase<TType> & {
      status: "error";
      errorMessage: string;
    } }[WorkerTaskType];

export type WorkerTaskCancelledResult =
  { [TType in WorkerTaskType]: WorkerTaskResultBase<TType> & {
      status: "cancelled";
    } }[WorkerTaskType];

export type WorkerTaskResult =
  | WorkerTaskSuccessResult
  | WorkerTaskErrorResult
  | WorkerTaskCancelledResult;

// @keep A Sitecore editor-state callback replaced the DOM generation used by this worker.
// @keep The pool must retire this worker and retry the task on a fresh document.
export type WorkerTaskDocumentStaleResult =
  { [TType in WorkerTaskType]: WorkerTaskResultBase<TType> & {
      status: "document-stale";
    } }[WorkerTaskType];

export type WorkerTaskExecutionResult =
  | WorkerTaskResult
  | WorkerTaskDocumentStaleResult;

export function isSuccessResult(result: WorkerTaskResult): result is WorkerTaskSuccessResult {
  return result.status === "success";
}

export function isDocumentStaleResult(
  result: WorkerTaskExecutionResult,
): result is WorkerTaskDocumentStaleResult {
  return result.status === "document-stale";
}

export function createDocumentStaleResult(task: WorkerTask): WorkerTaskDocumentStaleResult {
  return {
    requestId: task.requestId,
    taskId: task.taskId,
    type: task.type,
    status: "document-stale",
  };
}

export function createErrorResult(task: WorkerTask, errorMessage: string): WorkerTaskErrorResult {
  return {
    requestId: task.requestId,
    taskId: task.taskId,
    type: task.type,
    status: "error",
    errorMessage,
  };
}

export function createCancelledResult(task: WorkerTask): WorkerTaskCancelledResult {
  return {
    requestId: task.requestId,
    taskId: task.taskId,
    type: task.type,
    status: "cancelled",
  };
}

export type PoolWorkerState = "starting" | "idle" | "busy" | "retired";

export type PoolWorker = {
  target: WorkerTarget | undefined;
  state: PoolWorkerState;
  currentUrl: string | undefined;
  generation: number;
  retirementTimer: ReturnType<typeof setTimeout> | undefined;
  lastProgressAt: number;
  recoveryCount: number;
  activeTaskId: string | undefined;
};

export type QueuedTask = {
  task: WorkerTask;
  hostTabId: number | undefined;
  retried: boolean;
  editorStateChangeCount: number;
  submittedAt: number;
  deadlineAt: number;
  recoveryCount: number;
  resolve: (result: WorkerTaskResult) => void;
};

export type ActiveWorkerTask = {
  target: WorkerTarget;
  requestId: string;
  taskId: string;
};

export type WorkerExecutorContext = {
  activeTaskByWorkerKey: Map<string, ActiveWorkerTask>;
  cancelledRequestIds: Set<string>;
  createPendingWorker: () => PoolWorker;
  retireWorker: (worker: PoolWorker) => void;
  destroyRetiredWorker: (worker: PoolWorker, reason: string) => Promise<void>;
  retireAllWorkers: () => number;
  scheduleNext: () => void;
  isCurrentGeneration: () => boolean;
};