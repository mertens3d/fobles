import type { ItemGraphNodeData, LayoutSectionField, SitecoreHarvestSection } from "../../reference-data/model/model.types";
import type { WorkerTarget } from "../pool/pool.types";
import type { WorkClass } from "../work-scheduling.types";

export type SitecoreItemLocator = { kind: "id"; value: string } | { kind: "path"; value: string };

export type SitecoreResolvedResult<TValue> = {
  requested: SitecoreItemLocator;
  resolved?: { itemId: string; path?: string };
  value?: TValue;
  status: "found" | "not-found" | "error";
};

export type WorkerTaskType =
  | "get-template-bases"
  | "get-quick-info"
  | "get-parent"
  | "get-children"
  | "get-referrers"
  | "get-custom-fields"
  | "get-standard-fields"
  | "get-layout"
  | "set-raw-values"
  | "set-standard-fields";

export type WorkerTaskBase<TType extends WorkerTaskType> = {
  requestId: string;
  taskId: string;
  type: TType;
  // Page the worker must navigate to before executing this task.
  url: string;
  workClass?: WorkClass;
};

export type GetQuickInfoTask = WorkerTaskBase<"get-quick-info"> & { requested: SitecoreItemLocator };

export type GetTemplateBasesTask = WorkerTaskBase<"get-template-bases"> & { requested: SitecoreItemLocator };

export type GetParentTask = WorkerTaskBase<"get-parent">;

export type GetChildrenTask = WorkerTaskBase<"get-children">;

export type GetReferrersTask = WorkerTaskBase<"get-referrers">;

export type GetCustomFieldsTask = WorkerTaskBase<"get-custom-fields">;

export type GetStandardFieldsTask = WorkerTaskBase<"get-standard-fields">;

export type GetLayoutTask = WorkerTaskBase<"get-layout">;

export type SetRawValuesTask = WorkerTaskBase<"set-raw-values"> & { value: boolean };

export type SetStandardFieldsTask = WorkerTaskBase<"set-standard-fields"> & { value: boolean };

export type WorkerTask =
  | GetTemplateBasesTask
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
  "get-template-bases": { inheritedTemplateIds: readonly string[] | undefined };
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

export type WorkerTaskResultBase<TType extends WorkerTaskType> = { requestId: string; taskId: string; type: TType };

export type WorkerTaskSuccessResultFor<TType extends WorkerTaskType> = WorkerTaskResultBase<TType> & {
  status: "success";
  payload: WorkerTaskPayloadByType[TType];
};

export type WorkerTaskSuccessResult = { [TType in WorkerTaskType]: WorkerTaskSuccessResultFor<TType> }[WorkerTaskType];

export type WorkerTaskFailureCode = "layout-unavailable" | "layout-malformed";

export type WorkerTaskErrorResult = {
  [TType in WorkerTaskType]: WorkerTaskResultBase<TType> & { status: "error"; errorMessage: string; failureCode?: WorkerTaskFailureCode; failureDetails?: Record<string, unknown>; recoverable?: boolean };
}[WorkerTaskType];

export type WorkerTaskCancelledResult = {
  [TType in WorkerTaskType]: WorkerTaskResultBase<TType> & { status: "cancelled" };
}[WorkerTaskType];

export type WorkerTaskResult = WorkerTaskSuccessResult | WorkerTaskErrorResult | WorkerTaskCancelledResult;

export type WorkerTaskDocumentStaleResult = {
  [TType in WorkerTaskType]: WorkerTaskResultBase<TType> & { status: "document-stale" };
}[WorkerTaskType];

export type WorkerTaskExecutionResult = WorkerTaskResult | WorkerTaskDocumentStaleResult;

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
  queuedTask?: QueuedTask;
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
  retryQueuedAt?: number;
};

export type ActiveWorkerTask = { target: WorkerTarget; requestId: string; taskId: string };

export type WorkerExecutorContext = {
  activeTaskByWorkerKey: Map<string, ActiveWorkerTask>;
  cancelledRequestIds: Set<string>;
  requeueTask: (queued: QueuedTask) => void;
  retireWorker: (worker: PoolWorker) => void;
  destroyRetiredWorker: (worker: PoolWorker, reason: string) => Promise<void>;
  retireAllWorkers: () => number;
  scheduleNext: () => void;
  isCurrentGeneration: () => boolean;
};
