import type {
  WorkerTask,
  WorkerTaskCancelledResult,
  WorkerTaskDocumentStaleResult,
  WorkerTaskErrorResult,
  WorkerTaskExecutionResult,
  WorkerTaskFailureCode,
  WorkerTaskResult,
  WorkerTaskSuccessResult,
} from "./tasks.types.js";
// @source-path [fobles] src/content/foundation/workers/tasks/worker-task.types.ts

export function isSuccessResult(result: WorkerTaskResult): result is WorkerTaskSuccessResult {
  return result.status === "success";
}

export function isDocumentStaleResult(result: WorkerTaskExecutionResult): result is WorkerTaskDocumentStaleResult {
  return result.status === "document-stale";
}

export function createDocumentStaleResult(task: WorkerTask): WorkerTaskDocumentStaleResult {
  return { requestId: task.requestId, taskId: task.taskId, type: task.type, status: "document-stale" };
}

export function createErrorResult(
  task: WorkerTask,
  errorMessage: string,
  options?: { failureCode?: WorkerTaskFailureCode; failureDetails?: Record<string, unknown>; recoverable?: boolean },
): WorkerTaskErrorResult {
  return { requestId: task.requestId, taskId: task.taskId, type: task.type, status: "error", errorMessage, ...options };
}

export function createCancelledResult(task: WorkerTask): WorkerTaskCancelledResult {
  return { requestId: task.requestId, taskId: task.taskId, type: task.type, status: "cancelled" };
}
