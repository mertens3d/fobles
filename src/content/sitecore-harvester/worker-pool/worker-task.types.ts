// @source-path [fobles] src/content/sitecore-harvester/worker-pool/worker-task.types.ts

import type { BooleanTripleState } from "../../macros/ribbon-toggle-macro";
import type {
  ItemGraphNodeData,
  LayoutSectionField,
  RootItem,
  SitecoreHarvestSection,
} from "../sitecore-harvester.types";
import type { WorkerTarget } from "./worker-target";

export type WorkerTaskType =
  | "collect-root-item"
  | "collect-parent"
  | "collect-children"
  | "collect-referrers"
  | "collect-sections"
  | "collect-layouts"
  | "set-editor-state"
  | "enrich-item";

export type ItemLookup = {
  scItemId: string | undefined;
  scItemPath: string | undefined;
};

export type WorkerEditorState = {
  rawValues: BooleanTripleState;
  standardFields: BooleanTripleState;
};

type WorkerTaskBase<TType extends WorkerTaskType> = {
  requestId: string;
  taskId: string;
  type: TType;
  // Page the worker must navigate to before executing this task.
  url: string;
};

export type CollectRootItemTask = WorkerTaskBase<"collect-root-item">;
export type CollectParentTask = WorkerTaskBase<"collect-parent">;
export type CollectChildrenTask = WorkerTaskBase<"collect-children">;
export type CollectReferrersTask = WorkerTaskBase<"collect-referrers">;
export type CollectSectionsTask = WorkerTaskBase<"collect-sections">;
export type CollectLayoutsTask = WorkerTaskBase<"collect-layouts">;

export type SetEditorStateTask = WorkerTaskBase<"set-editor-state"> & {
  editorState: WorkerEditorState;
};

export type EnrichItemTask = WorkerTaskBase<"enrich-item"> & {
  lookup: ItemLookup;
};

export type WorkerTask =
  | CollectRootItemTask
  | CollectParentTask
  | CollectChildrenTask
  | CollectReferrersTask
  | CollectSectionsTask
  | CollectLayoutsTask
  | SetEditorStateTask
  | EnrichItemTask;

export type WorkerTaskPayloadByType = {
  "collect-root-item": { rootItem: RootItem };
  "collect-parent": { parent: ItemGraphNodeData | undefined };
  "collect-children": { childItems: readonly ItemGraphNodeData[] };
  "collect-referrers": { referrers: readonly ItemGraphNodeData[] };
  "collect-sections": { sections: readonly SitecoreHarvestSection[] };
  "collect-layouts": { layoutSectionFields: LayoutSectionField[] };
  "set-editor-state": { editorState: WorkerEditorState };
  "enrich-item": { item: ItemGraphNodeData };
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
};

export type QueuedTask = {
  task: WorkerTask;
  hostTabId: number | undefined;
  retried: boolean;
  editorStateChangeCount: number;
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
  retireAllWorkers: () => number;
  scheduleNext: () => void;
  isCurrentGeneration: () => boolean;
};