import type { WorkerTask, WorkerTaskResult } from "../tasks/worker-task.types";
import {
  MESSAGE_TYPE
} from "./worker.messages";

export const WORKER_POOL_STATUS_MESSAGE_TYPE = MESSAGE_TYPE.WORKER_POOL_STATUS;

export type { WorkerTask, WorkerTaskResult };
