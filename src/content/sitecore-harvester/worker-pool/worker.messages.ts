// @source-path [fobles] src/content/sitecore-harvester/worker-pool/worker.messages.ts

import { REFERENCE_GRAPH } from "../../../constants/graph.const";
import type {
  WorkerTask,
  WorkerTaskResult,
} from "./worker-task.types";

const MESSAGE_TYPE =
  REFERENCE_GRAPH.BACKGROUND_HARVEST.MESSAGE.TYPE;

export type PoolRunTaskMessage = {
  type: typeof MESSAGE_TYPE.POOL_RUN_TASK;
  task: WorkerTask;
};

export type PoolCancelRequestMessage = {
  type: typeof MESSAGE_TYPE.POOL_CANCEL_REQUEST;
  requestId: string;
};

export type PoolDisposeMessage = {
  type: typeof MESSAGE_TYPE.POOL_DISPOSE;
};

export type WorkerReadyMessage = {
  type: typeof MESSAGE_TYPE.WORKER_READY;
};

export type WorkerAdoptedMessage = {
  type: typeof MESSAGE_TYPE.WORKER_ADOPTED;
};

export type WorkerTaskExecuteMessage = {
  type: typeof MESSAGE_TYPE.WORKER_TASK_EXECUTE;
  task: WorkerTask;
};

export type WorkerTaskCancelMessage = {
  type: typeof MESSAGE_TYPE.WORKER_TASK_CANCEL;
  requestId: string;
  taskId: string;
};

export type WorkerPoolMessage =
  | PoolRunTaskMessage
  | PoolCancelRequestMessage
  | PoolDisposeMessage
  | WorkerReadyMessage
  | WorkerSetOwnedMessage
  | WorkerAdoptedMessage
  | WorkerTaskExecuteMessage
  | WorkerTaskCancelMessage;

type WorkerTabIncomingMessage =
  | WorkerSetOwnedMessage
  | WorkerTaskExecuteMessage
  | WorkerTaskCancelMessage;
  
export type {
  WorkerTask,
  WorkerTaskResult,
};

export type WorkerSetOwnedMessage = {
  type: typeof MESSAGE_TYPE.WORKER_SET_OWNED;
};