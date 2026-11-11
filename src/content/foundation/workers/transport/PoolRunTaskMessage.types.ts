import type { WorkerTask, WorkerTaskResult } from "../tasks/worker-task.types";
import {
  MESSAGE_TYPE,
  type WORKER_IFRAME_READY_MESSAGE_TYPE,
  type WORKER_IFRAME_CREATE_MESSAGE_TYPE,
  type WORKER_IFRAME_NAVIGATE_MESSAGE_TYPE,
  type WORKER_IFRAME_REMOVE_MESSAGE_TYPE,
  type WORKER_IFRAME_REMOVE_ALL_MESSAGE_TYPE,
} from "./worker.messages";

export const WORKER_POOL_STATUS_MESSAGE_TYPE = MESSAGE_TYPE.WORKER_POOL_STATUS;

export type { WorkerTask, WorkerTaskResult };
