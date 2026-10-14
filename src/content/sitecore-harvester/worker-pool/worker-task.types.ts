// @source-path [fobles] src/content/sitecore-harvester/worker-pool/worker-task.types.ts

import type {
  ItemGraphNodeData,
  LayoutSectionField,
  RootItem,
  SitecoreHarvestSection,
} from "../sitecore-harvester.types";

export type WorkerTaskType =
  | "collect-root-item"
  | "collect-parent"
  | "collect-children"
  | "collect-referrers"
  | "collect-sections"
  | "collect-layouts"
  | "enrich-item";

export type ItemLookup = {
  scItemId: string | undefined;
  scItemPath: string | undefined;
};

type WorkerTaskBase<TType extends WorkerTaskType> = {
  requestId: string;
  taskId: string;
  type: TType;
  // Page the worker tab must be navigated to before executing this task.
  url: string;
};

export type CollectRootItemTask = WorkerTaskBase<"collect-root-item">;
export type CollectParentTask = WorkerTaskBase<"collect-parent">;
export type CollectChildrenTask = WorkerTaskBase<"collect-children">;
export type CollectReferrersTask = WorkerTaskBase<"collect-referrers">;
export type CollectSectionsTask = WorkerTaskBase<"collect-sections">;
export type CollectLayoutsTask = WorkerTaskBase<"collect-layouts">;

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
  | EnrichItemTask;

export type WorkerTaskPayloadByType = {
  "collect-root-item": { rootItem: RootItem };
  "collect-parent": { parent: ItemGraphNodeData | undefined };
  "collect-children": { childItems: readonly ItemGraphNodeData[] };
  "collect-referrers": { referrers: readonly ItemGraphNodeData[] };
  "collect-sections": { sections: readonly SitecoreHarvestSection[] };
  "collect-layouts": { layoutSectionFields: LayoutSectionField[] };
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

// Distributing the mapped type over WorkerTaskType builds a true discriminated union (one
// member per task type, each with its own `payload` shape) instead of a single generic type
// whose `payload` can't be narrowed by checking `.type`.
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

export function isSuccessResult(
  result: WorkerTaskResult,
): result is WorkerTaskSuccessResult {
  return result.status === "success";
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
