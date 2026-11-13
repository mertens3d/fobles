// @source-path [fobles] src/content/foundation/workers/pool/worker-pool-client.ts
import { CONST } from "../../../../constants/const";
import { extensionLog } from "../../../logger";
import { WORKER_MESSAGE_TYPE } from "../worker-protocol.const";
import type { WorkerPoolStatus } from "./pool.types";
import type { WorkerTaskResult } from "../tasks/tasks.types";
import type { WorkerTask } from "../tasks/tasks.types";
import type { WorkerPoolStatusMessage } from "../transport/transport.types";
import type { PoolDisposeMessage } from "../transport/transport.types";
import type { PoolCancelTaskMessage } from "../transport/transport.types";
import type { PoolCancelRequestMessage } from "../transport/transport.types";
import type { PoolRunTaskMessage } from "../transport/transport.types";

export async function runWorkerTask(task: WorkerTask): Promise<WorkerTaskResult | undefined> {
  const message: PoolRunTaskMessage = { type: CONST.FOBLES.WORKER.MESSAGE_TYPE.POOL_RUN_TASK, task };
  const startedAt = performance.now();
  extensionLog.debug("Worker pool client: task send started", {
    requestId: task.requestId,
    taskId: task.taskId,
    taskType: task.type,
    url: task.url,
  });
  try {
    const result = await chrome.runtime.sendMessage<PoolRunTaskMessage, WorkerTaskResult | undefined>(message);
    extensionLog.debug("Worker pool client: task send settled", {
      requestId: task.requestId,
      taskId: task.taskId,
      taskType: task.type,
      elapsedMs: Math.round(performance.now() - startedAt),
      resultStatus: result?.status,
      resultType: result?.type,
    });
    return result;
  } catch (error) {
    extensionLog.error("Worker pool client: task send rejected", {
      requestId: task.requestId,
      taskId: task.taskId,
      taskType: task.type,
      elapsedMs: Math.round(performance.now() - startedAt),
      error,
    });
    throw error;
  }
}

export function disposeBackgroundWorkerPool(): Promise<void> {
  const message: PoolDisposeMessage = { type: CONST.FOBLES.WORKER.MESSAGE_TYPE.POOL_DISPOSE };
  return chrome.runtime.sendMessage(message);
}

export function cancelWorkerRequest(requestId: string): void {
  const message: PoolCancelRequestMessage = { type: CONST.FOBLES.WORKER.MESSAGE_TYPE.POOL_CANCEL_REQUEST, requestId };
  void chrome.runtime.sendMessage(message);
}

export function cancelWorkerTask(requestId: string, taskId: string): void {
  const message: PoolCancelTaskMessage = { type: CONST.FOBLES.WORKER.MESSAGE_TYPE.POOL_CANCEL_TASK, requestId, taskId };
  void chrome.runtime.sendMessage(message);
}

export function getWorkerPoolStatus(requestId?: string): Promise<WorkerPoolStatus | undefined> {
  const message: WorkerPoolStatusMessage = { type: WORKER_MESSAGE_TYPE.WORKER_POOL_STATUS, requestId };
  return chrome.runtime.sendMessage<WorkerPoolStatusMessage, WorkerPoolStatus | undefined>(message);
}
