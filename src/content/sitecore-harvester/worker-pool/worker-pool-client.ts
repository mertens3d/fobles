// @source-path [fobles] src/content/sitecore-harvester/worker-pool/worker-pool-client.ts

import { REFERENCE_GRAPH } from "../../../constants/graph.const";
import type {
  WorkerTask,
  WorkerTaskResult,
} from "./worker-task.types";
import type {
  PoolCancelRequestMessage,
  PoolCancelTaskMessage,
  PoolDisposeMessage,
  PoolRunTaskMessage,
} from "./worker.messages";

const MESSAGE_TYPE =
  REFERENCE_GRAPH.BACKGROUND_HARVEST.MESSAGE.TYPE;

export async function runWorkerTask(
  task: WorkerTask,
): Promise<WorkerTaskResult | undefined> {
  const message: PoolRunTaskMessage = {
    type: MESSAGE_TYPE.POOL_RUN_TASK,
    task,
  };

  return await chrome.runtime.sendMessage<
    PoolRunTaskMessage,
    WorkerTaskResult | undefined
  >(message);
}

export function disposeBackgroundWorkerPool(): Promise<void> {
  const message: PoolDisposeMessage = {
    type: MESSAGE_TYPE.POOL_DISPOSE,
  };

  return chrome.runtime.sendMessage(message);
}

export function cancelWorkerRequest(
  requestId: string,
): void {
  const message: PoolCancelRequestMessage = {
    type: MESSAGE_TYPE.POOL_CANCEL_REQUEST,
    requestId,
  };

  void chrome.runtime.sendMessage(message);
}

export function cancelWorkerTask(
  requestId: string,
  taskId: string,
): void {
  const message: PoolCancelTaskMessage = {
    type: MESSAGE_TYPE.POOL_CANCEL_TASK,
    requestId,
    taskId,
  };

  void chrome.runtime.sendMessage(message);
}