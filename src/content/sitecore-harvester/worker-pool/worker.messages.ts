// @source-path [fobles] src/content/sitecore-harvester/worker-pool/worker.messages.ts

import { REFERENCE_GRAPH } from "../../../constants/graph.const";
import type { WorkerTask, WorkerTaskResult } from "./worker-task.types";

const MESSAGE_TYPE = REFERENCE_GRAPH.BACKGROUND_HARVEST.MESSAGE.TYPE;

// Foreground (any tab) -> service worker. Response is the WorkerTaskResult for `task`.
export type PoolRunTaskMessage = {
  type: typeof MESSAGE_TYPE.POOL_RUN_TASK;
  task: WorkerTask;
};

// Foreground -> service worker. Fire-and-forget; drops queued/active pool work for requestId.
export type PoolCancelRequestMessage = {
  type: typeof MESSAGE_TYPE.POOL_CANCEL_REQUEST;
  requestId: string;
};

// Worker tab content script -> service worker, sent once per (re)navigation.
export type WorkerReadyMessage = {
  type: typeof MESSAGE_TYPE.WORKER_READY;
};

// Service worker -> one specific worker tab. Response is the WorkerTaskResult for `task`.
export type WorkerTaskExecuteMessage = {
  type: typeof MESSAGE_TYPE.WORKER_TASK_EXECUTE;
  task: WorkerTask;
};

// Service worker -> one specific worker tab. Best-effort abort; no response expected.
export type WorkerTaskCancelMessage = {
  type: typeof MESSAGE_TYPE.WORKER_TASK_CANCEL;
  requestId: string;
  taskId: string;
};

export type WorkerPoolMessage =
  | PoolRunTaskMessage
  | PoolCancelRequestMessage
  | WorkerReadyMessage
  | WorkerTaskExecuteMessage
  | WorkerTaskCancelMessage;

export type { WorkerTask, WorkerTaskResult };
