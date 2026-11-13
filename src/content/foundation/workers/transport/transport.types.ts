import type { WorkerTaskExecutionResult } from "../tasks/tasks.types";
import type { WorkerTask } from "../tasks/tasks.types";
import type { MESSAGE_TYPE, WORKER_IFRAME_CREATE_MESSAGE_TYPE, WORKER_IFRAME_NAVIGATE_MESSAGE_TYPE, WORKER_IFRAME_READY_MESSAGE_TYPE, WORKER_IFRAME_REMOVE_ALL_MESSAGE_TYPE, WORKER_IFRAME_REMOVE_MESSAGE_TYPE } from "./transport.const";

export type ExecuteWorkerTask = (
  doc: Document,
  task: WorkerTask,
  signal: AbortSignal
) => Promise<WorkerTaskExecutionResult>;

export type IsWorkerDocumentReady = (doc: Document) => boolean;

export type PoolRunTaskMessage = { type: typeof MESSAGE_TYPE.POOL_RUN_TASK; task: WorkerTask };

export type PoolCancelRequestMessage = { type: typeof MESSAGE_TYPE.POOL_CANCEL_REQUEST; requestId: string };

export type PoolCancelTaskMessage = { type: typeof MESSAGE_TYPE.POOL_CANCEL_TASK; requestId: string; taskId: string };

export type PoolDisposeMessage = { type: typeof MESSAGE_TYPE.POOL_DISPOSE };

export type WorkerPoolStatusMessage = { type: typeof MESSAGE_TYPE.WORKER_POOL_STATUS; requestId?: string };

export type WorkerReadyMessage = { type: typeof MESSAGE_TYPE.WORKER_READY };

export type WorkerIframeReadyMessage = { type: typeof WORKER_IFRAME_READY_MESSAGE_TYPE; workerId: string };

export type WorkerIframeCreateMessage = { type: typeof WORKER_IFRAME_CREATE_MESSAGE_TYPE; url: string };

export type WorkerIframeCreateResult = { workerId: string };

export type WorkerIframeNavigateMessage = {
  type: typeof WORKER_IFRAME_NAVIGATE_MESSAGE_TYPE;
  workerId: string;
  url: string;
};

export type WorkerIframeRemoveMessage = { type: typeof WORKER_IFRAME_REMOVE_MESSAGE_TYPE; workerId: string };

export type WorkerIframeRemoveAllMessage = { type: typeof WORKER_IFRAME_REMOVE_ALL_MESSAGE_TYPE };

export type WorkerAdoptedMessage = { type: typeof MESSAGE_TYPE.WORKER_ADOPTED };

export type WorkerTaskExecuteMessage = { type: typeof MESSAGE_TYPE.WORKER_TASK_EXECUTE; task: WorkerTask };

export type WorkerTaskCancelMessage = {
  type: typeof MESSAGE_TYPE.WORKER_TASK_CANCEL;
  requestId: string;
  taskId: string;
};

export type WorkerSetOwnedMessage = { type: typeof MESSAGE_TYPE.WORKER_SET_OWNED };

export type WorkerPoolMessage =
  | PoolRunTaskMessage
  | PoolCancelRequestMessage
  | PoolCancelTaskMessage
  | PoolDisposeMessage
  | WorkerPoolStatusMessage
  | WorkerReadyMessage
  | WorkerIframeReadyMessage
  | WorkerIframeCreateMessage
  | WorkerIframeNavigateMessage
  | WorkerIframeRemoveMessage
  | WorkerIframeRemoveAllMessage
  | WorkerSetOwnedMessage
  | WorkerAdoptedMessage
  | WorkerTaskExecuteMessage
  | WorkerTaskCancelMessage;

export type WorkerTabIncomingMessage = WorkerSetOwnedMessage | WorkerTaskExecuteMessage | WorkerTaskCancelMessage;

export type WorkerIframeHostMessage =
  WorkerIframeCreateMessage | WorkerIframeNavigateMessage | WorkerIframeRemoveMessage | WorkerIframeRemoveAllMessage;
