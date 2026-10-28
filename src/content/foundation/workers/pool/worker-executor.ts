// @source-path [fobles] src/content/foundation/workers/pool/worker-executor.ts

import { extensionLog } from "../../../logger";
import { closeWorkerTarget, createWorkerTarget, getWorkerTargetKey, markWorkerTargetOwned, navigateWorkerTarget, sendTaskToWorkerTarget } from "../transport/worker-target-service";
import { resetWorkerReadiness, waitForWorkerReady } from "./worker-readiness";
import { createCancelledResult, createErrorResult, type PoolWorker, type QueuedTask, type WorkerExecutorContext, type WorkerTaskResult } from "../tasks/worker-task.types";
import { isWorkerTabTarget, type WorkerTarget } from "./worker-target";
import { DEBUG_WORKER_POOL } from "../worker-protocol.const";
import { publishActivityToHost } from "../../../shared/activity/activity-events";
import { labelForWorkerTask } from "../../../shared/activity/activity-labels";
import { getRuntimeSettings } from "../../../runtime-settings/runtime-settings";

const READY_TIMEOUT_MS = 20000;
const MAX_EDITOR_STATE_CHANGES = 2;
function remainingJobMs(queued: QueuedTask): number { 
return Math.max(0, queued.deadlineAt - performance.now()); }

// A job's time limit covers the time it runs, not the time it waits in the queue behind other jobs. The clock starts the
// first time the job is handed to a worker. Recovery and document-stale retries come back through the same entry points
// and share that clock, so a job is still bounded overall.
const startedJobs = new WeakSet<QueuedTask>();

function startJobClock(queued: QueuedTask): void {
  if (!startedJobs.has(queued)) {
    const taskTimeoutMs = getRuntimeSettings().workerPool.taskTimeoutMs;

    startedJobs.add(queued);
    queued.deadlineAt = performance.now() + taskTimeoutMs;

    extensionLog.debug("Worker pool: job clock started", {
      taskId: queued.task.taskId,
      taskType: queued.task.type,
      queueWaitMs: Math.round(performance.now() - queued.submittedAt),
      taskTimeoutMs,
    });
  }
}
async function withinJobDeadline<T>(queued: QueuedTask, operation: Promise<T>, label: string): Promise<T> {
  const remainingMs = remainingJobMs(queued);
  if (remainingMs <= 0) 
throw new Error(`Worker job deadline exhausted before ${label}`);
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([operation, new Promise<T>((_resolve, reject) => { 
timeoutId = setTimeout(() => reject(new Error(`Worker job deadline exhausted during ${label}`)), remainingMs); })]);
  } finally { if (timeoutId !== undefined) 
clearTimeout(timeoutId); }
}

async function closeWorker(context: WorkerExecutorContext, worker: PoolWorker): Promise<void> {
  const target = worker.target;
  context.retireWorker(worker);

  if (target) {
    if (isWorkerTabTarget(target)) 
resetWorkerReadiness(target.tabId);

    try {
      await closeWorkerTarget(target);
    } catch (error) {
      // Closing means "this worker no longer exists". A failed close must not abort the caller's retry or resolve
      // decision, or the task is left unresolved. The Shell's final iframe sweep remains the safety net.
      extensionLog.warn("Worker pool: worker close failed; continuing", { workerKey: getWorkerTargetKey(target), error });
    }

    worker.target = undefined;
  }
}

function cancelStaleWorker(context: WorkerExecutorContext, worker: PoolWorker, queued: QueuedTask): void {
  // @keep A stale-generation worker may still be processing a Sitecore callback.
  // @keep Retire it logically without navigating or removing its document.
  context.retireWorker(worker);
  queued.resolve(createCancelledResult(queued.task));
}

async function cancelAndDestroyNewWorker(context: WorkerExecutorContext, worker: PoolWorker, queued: QueuedTask, target: WorkerTarget, reason: string): Promise<void> {
  worker.target = target;
  context.retireWorker(worker);
  queued.resolve(createCancelledResult(queued.task));

  extensionLog.debug("Worker pool: destroying newly-created stale worker", {
    reason,
    taskId: queued.task.taskId,
    taskType: queued.task.type,
    workerKey: getWorkerTargetKey(target),
  });

  await context.destroyRetiredWorker(worker, reason);
}

async function finishRetiredWorker(context: WorkerExecutorContext, worker: PoolWorker, queued: QueuedTask): Promise<void> {
  queued.resolve(createCancelledResult(queued.task));
  await context.destroyRetiredWorker(worker, "active-task-settled");
}

async function retryOrResolveError(context: WorkerExecutorContext, worker: PoolWorker, queued: QueuedTask, errorMessage: string): Promise<void> {
  await closeWorker(context, worker);

  const maxRecoveries = getRuntimeSettings().workerPool.workerMaxRecoveriesPerJob;

  if (!context.isCurrentGeneration()) {
    queued.resolve(createCancelledResult(queued.task));
  } else if (remainingJobMs(queued) <= 0) {
    extensionLog.warn("Worker health: job deadline exhausted; recovery skipped", { taskId: queued.task.taskId, taskType: queued.task.type, recoveryCount: queued.recoveryCount, maxRecoveries, errorMessage });
    queued.resolve(createErrorResult(queued.task, `Worker job exceeded total execution budget: ${errorMessage}`));
    context.scheduleNext();
  } else if (queued.recoveryCount < maxRecoveries) {
    queued.retried = true;
    queued.recoveryCount += 1;
    worker.recoveryCount += 1;
    extensionLog.warn("Worker health: retrying job", {
      taskId: queued.task.taskId,
      taskType: queued.task.type,
      recoveryCount: queued.recoveryCount,
      maxRecoveries,
      errorMessage,
    });
    await runTaskOnNewWorker(context, context.createPendingWorker(), queued);
    context.scheduleNext();
  } else {
    extensionLog.warn("Worker health: job recovery exhausted", {
      taskId: queued.task.taskId,
      taskType: queued.task.type,
      recoveryCount: queued.recoveryCount,
      maxRecoveries,
      errorMessage,
    });
    queued.resolve(createErrorResult(queued.task, errorMessage));
    context.scheduleNext();
  }
}

async function retryAfterDocumentStale(context: WorkerExecutorContext, worker: PoolWorker, queued: QueuedTask): Promise<void> {
  const retiredTarget = worker.target;

  if (queued.task.type === "set-raw-values" || queued.task.type === "set-standard-fields") {
    const retiredWorkerCount = context.retireAllWorkers();
    extensionLog.debug("Worker pool: editor state changed; all current workers retired", { taskId: queued.task.taskId, retiredWorkerCount });
  } else {
    context.retireWorker(worker);
  }

  if (queued.editorStateChangeCount >= MAX_EDITOR_STATE_CHANGES) {
    queued.resolve(createErrorResult(queued.task, `Worker document did not stabilize after ${MAX_EDITOR_STATE_CHANGES} state changes`));
    context.scheduleNext();
  } else {
    queued.editorStateChangeCount += 1;

    extensionLog.debug("Worker pool: document stale; worker retired; retrying task on fresh worker", {
      taskId: queued.task.taskId,
      taskType: queued.task.type,
      editorStateChangeCount: queued.editorStateChangeCount,
      retiredWorkerKey: retiredTarget ? getWorkerTargetKey(retiredTarget) : undefined,
    });

    await runTaskOnNewWorker(context, context.createPendingWorker(), queued);
    context.scheduleNext();
  }
}

async function runTaskOnWorker(context: WorkerExecutorContext, worker: PoolWorker, queued: QueuedTask): Promise<void> {
  const target = worker.target;
  if (!target || isWorkerRetired(worker) || !context.isCurrentGeneration()) { 
cancelStaleWorker(context, worker, queued); 
return; }
  worker.state = "busy";
  worker.lastProgressAt = performance.now();
  worker.activeTaskId = queued.task.taskId;
  const workerKey = getWorkerTargetKey(target);
  const taskTimeoutMs = Math.min(getRuntimeSettings().workerPool.taskTimeoutMs, remainingJobMs(queued));
  context.activeTaskByWorkerKey.set(workerKey, { target, requestId: queued.task.requestId, taskId: queued.task.taskId });
  let executionResult: Awaited<ReturnType<typeof sendTaskToWorkerTarget>> | undefined;
  let timedOut = false;
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    publishActivityToHost(queued.hostTabId, { source: "worker", requestId: queued.task.requestId, activityId: queued.task.taskId, kind: queued.task.type, label: labelForWorkerTask(queued.task), state: "started", detail: workerKey });
    extensionLog.debug(`Worker pool[${workerKey}]: executing task`, { workerKey, taskId: queued.task.taskId, taskType: queued.task.type, url: queued.task.url, taskTimeoutMs });
    const timeout = new Promise<undefined>((resolve) => { 
timeoutId = setTimeout(() => { 
timedOut = true; 
resolve(undefined); }, taskTimeoutMs); });
    executionResult = await Promise.race([sendTaskToWorkerTarget(target, queued.task), timeout]);
  } catch (error) {
    extensionLog.warn("Worker pool: task execution failed", { workerKey, task: queued.task, error });
  } finally {
    if (timeoutId !== undefined) 
clearTimeout(timeoutId);
    context.activeTaskByWorkerKey.delete(workerKey);
  }
  if (timedOut) {
    const message = `Worker task exceeded ${taskTimeoutMs} ms execution limit`;
    extensionLog.warn("Worker pool: task execution timed out", { workerKey, taskId: queued.task.taskId, taskType: queued.task.type, url: queued.task.url, taskTimeoutMs });
    publishActivityToHost(queued.hostTabId, { source: "worker", requestId: queued.task.requestId, activityId: queued.task.taskId, kind: queued.task.type, label: labelForWorkerTask(queued.task), state: "error", detail: message });
    await retryOrResolveError(context, worker, queued, message);
    return;
  }
  extensionLog.debug(`Worker pool[${workerKey}]: task returned` + ` taskId=${queued.task.taskId}` + ` taskType=${queued.task.type}` + ` resultStatus=${String(executionResult?.status)}` + ` resultType=${String(executionResult?.type)}` + ` editorStateChangeCount=${queued.editorStateChangeCount}`);
  if (isWorkerRetired(worker) || !context.isCurrentGeneration()) { 
await finishRetiredWorker(context, worker, queued); 
return; }
  if (context.cancelledRequestIds.has(queued.task.requestId)) { 
context.retireWorker(worker); 
queued.resolve(createCancelledResult(queued.task)); 
await context.destroyRetiredWorker(worker, "cancelled-task-settled"); 
context.scheduleNext(); 
return; }
  if (executionResult?.status === "document-stale") {
    extensionLog.debug(`Worker pool: document-stale result intercepted` + ` taskId=${queued.task.taskId}` + ` taskType=${queued.task.type}` + ` editorStateChangeCount=${queued.editorStateChangeCount}`);
    await retryAfterDocumentStale(context, worker, queued);
    return;
  }
  const result: WorkerTaskResult | undefined = executionResult;
  if (!result) { 
await retryOrResolveError(context, worker, queued, "Worker task failed with no result"); 
return; }
  worker.state = "idle";
  worker.lastProgressAt = performance.now();
  worker.activeTaskId = undefined;
  publishActivityToHost(queued.hostTabId, { source: "worker", requestId: queued.task.requestId, activityId: queued.task.taskId, kind: queued.task.type, label: labelForWorkerTask(queued.task), state: result.status === "cancelled" ? "cancelled" : result.status === "error" ? "error" : "completed", detail: result.status });
  queued.resolve(result);
  context.scheduleNext();
}

async function prepareCreatedTarget(context: WorkerExecutorContext, worker: PoolWorker, queued: QueuedTask, target: WorkerTarget): Promise<boolean> {
  worker.target = target;
  worker.currentUrl = queued.task.url;
  worker.lastProgressAt = performance.now();

  if (isWorkerTabTarget(target)) 
await waitForWorkerReady(target.tabId, READY_TIMEOUT_MS);

  if (isWorkerRetired(worker) || !context.isCurrentGeneration()) {
    await cancelAndDestroyNewWorker(context, worker, queued, target, "new-worker-stale-after-ready");
    return false;
  }

  await markWorkerTargetOwned(target);

  if (isWorkerRetired(worker) || !context.isCurrentGeneration()) {
    await cancelAndDestroyNewWorker(context, worker, queued, target, "new-worker-stale-after-owned");
    return false;
  }

  worker.state = "busy";
  return true;
}

async function runOnNewWorker(context: WorkerExecutorContext, worker: PoolWorker, queued: QueuedTask): Promise<void> {
  // Every path that creates a pending worker (first assignment, document-stale retry, bounded recovery) comes through here.
  // Claim the task before the first await. Otherwise the pool health supervisor sees a "starting" worker with no active
  // task, calls it unhealthy, retires it, and the task is resolved as cancelled when its iframe finally becomes ready.
  worker.activeTaskId = queued.task.taskId;
  worker.lastProgressAt = performance.now();

  let target: WorkerTarget | undefined;

  try {
    target = await withinJobDeadline(queued, createWorkerTarget(queued.hostTabId, queued.task.url, DEBUG_WORKER_POOL), "worker creation/readiness");
  } catch (error) {
    extensionLog.warn("Worker pool: failed to create worker", { hostTabId: queued.hostTabId, task: queued.task, error });
  }

  if (isWorkerRetired(worker) || !context.isCurrentGeneration()) {
    if (target) {
      await cancelAndDestroyNewWorker(context, worker, queued, target, "new-worker-created-after-generation-retired");
    } else {
      cancelStaleWorker(context, worker, queued);
    }
    return;
  }

  if (!target) {
    await retryOrResolveError(context, worker, queued, "Failed to create worker");
    return;
  }

  try {
    const ready = await prepareCreatedTarget(context, worker, queued, target);
    if (ready) 
await runTaskOnWorker(context, worker, queued);
  } catch (error) {
    extensionLog.warn("Worker pool: worker failed to become ready", {
      target,
      task: queued.task,
      retried: queued.retried,
      error,
    });

    if (isWorkerRetired(worker) || !context.isCurrentGeneration()) {
      if (!worker.target) 
worker.target = target;
      context.retireWorker(worker);
      queued.resolve(createCancelledResult(queued.task));
      await context.destroyRetiredWorker(worker, "worker-ready-failed-after-retirement");
      return;
    }

    await retryOrResolveError(context, worker, queued, "Worker failed to become ready");
  }
}

function isWorkerRetired(worker: PoolWorker): boolean {
  return worker.state === "retired";
}

async function navigateExistingWorker(context: WorkerExecutorContext, worker: PoolWorker, queued: QueuedTask): Promise<boolean> {
  const target = worker.target;

  if (!target || isWorkerRetired(worker)) 
return false;

  if (isWorkerTabTarget(target)) 
resetWorkerReadiness(target.tabId);

  const updatedTarget = await withinJobDeadline(queued, navigateWorkerTarget(target, queued.task.url), "worker navigation/readiness");

  if (isWorkerRetired(worker) || !context.isCurrentGeneration()) {
    cancelStaleWorker(context, worker, queued);
    return false;
  }

  worker.target = updatedTarget;

  if (isWorkerTabTarget(updatedTarget)) 
await waitForWorkerReady(updatedTarget.tabId, READY_TIMEOUT_MS);

  if (isWorkerRetired(worker) || !context.isCurrentGeneration()) {
    cancelStaleWorker(context, worker, queued);
    return false;
  }

  await markWorkerTargetOwned(updatedTarget);

  if (isWorkerRetired(worker) || !context.isCurrentGeneration()) {
    cancelStaleWorker(context, worker, queued);
    return false;
  }

  worker.currentUrl = queued.task.url;
  worker.state = "busy";
  return true;
}

export async function runWorkerTask(context: WorkerExecutorContext, worker: PoolWorker, queued: QueuedTask): Promise<void> {
  startJobClock(queued);

  let canRunTask = context.isCurrentGeneration() && !isWorkerRetired(worker) && worker.target !== undefined;

  if (canRunTask && worker.currentUrl !== queued.task.url) {
    try {
      canRunTask = await navigateExistingWorker(context, worker, queued);
    } catch (error) {
      canRunTask = false;

      extensionLog.warn("Worker pool: failed to navigate worker", {
        target: worker.target,
        task: queued.task,
        retried: queued.retried,
        error,
      });

      if (isWorkerRetired(worker)) {
        queued.resolve(createCancelledResult(queued.task));
      } else {
        await retryOrResolveError(context, worker, queued, "Worker failed to navigate");
      }
    }
  }

  if (canRunTask && context.isCurrentGeneration() && !isWorkerRetired(worker)) {
    await runTaskOnWorker(context, worker, queued);
  }
}

export async function runTaskOnNewWorker(context: WorkerExecutorContext, worker: PoolWorker, queued: QueuedTask): Promise<void> {
  startJobClock(queued);
  await runOnNewWorker(context, worker, queued);
}