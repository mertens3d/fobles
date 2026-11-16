// @source-path [fobles] src/content/foundation/workers/pool/worker-pool-client.ts

import { CONST } from "../../../../constants/const.ts";
import { extensionLog } from "../../../logger.ts";
import { reportFoblesError } from "../../../shared/error-manager/error-manager.ts";
import { createErrorResult } from "../tasks/worker-task.ts";
import { WORKER_MESSAGE_TYPE } from "../worker-protocol.const.ts";
import type { WorkerPoolStatus } from "./pool.types.ts";
import type { WorkerTaskResult } from "../tasks/tasks.types.ts";
import type { WorkerTask } from "../tasks/tasks.types.ts";
import type { WorkerPoolStatusMessage } from "../transport/transport.types.ts";
import type { PoolDisposeMessage } from "../transport/transport.types.ts";
import type { PoolCancelTaskMessage } from "../transport/transport.types.ts";
import type { PoolCancelRequestMessage } from "../transport/transport.types.ts";
import type { PoolRunTaskMessage } from "../transport/transport.types.ts";

export async function runWorkerTask(task: WorkerTask): Promise<WorkerTaskResult> {
  const message: PoolRunTaskMessage = { type: CONST.FOBLES.WORKER.MESSAGE_TYPE.POOL_RUN_TASK, task };
  const startedAt = performance.now();
  extensionLog.debug("Worker pool client: task send started", {
    requestId: task.requestId,
    taskId: task.taskId,
    taskType: task.type,
    url: task.url,
  });
  try {
    const response = await chrome.runtime.sendMessage<PoolRunTaskMessage, WorkerTaskResult | undefined>(message);
    const result = response ?? createErrorResult(task, "Worker pool returned no response");
    if (!response) {
      reportFoblesError("Worker pool returned no response", undefined, { requestId: task.requestId, taskId: task.taskId, taskType: task.type });
    }
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
    reportFoblesError("Worker pool transport failed", error, { requestId: task.requestId, taskId: task.taskId, taskType: task.type });
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

export async function disposeBackgroundWorkerPool(): Promise<void> {
  const message: PoolDisposeMessage = { type: CONST.FOBLES.WORKER.MESSAGE_TYPE.POOL_DISPOSE };
  try {
    const response = await chrome.runtime.sendMessage<PoolDisposeMessage, unknown>(message);
    if (!response || typeof response !== "object" || !("ok" in response) || response.ok !== true) {
      const errorMessage = response && typeof response === "object" && "errorMessage" in response && typeof response.errorMessage === "string"
        ? response.errorMessage
        : "Worker pool disposal returned no success response";
      throw new Error(errorMessage);
    }
  } catch (error) {
    reportFoblesError("Worker pool disposal failed", error);
    throw error;
  }
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
