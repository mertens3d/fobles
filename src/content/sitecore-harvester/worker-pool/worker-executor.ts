// @source-path [fobles] src/content/sitecore-harvester/worker-pool/worker-executor.ts

import { REFERENCE_GRAPH } from "../../../constants/graph.const";
import { extensionLog } from "../../logger";
import {
  closeWorkerTarget,
  createWorkerTarget,
  getWorkerTargetKey,
  markWorkerTargetOwned,
  navigateWorkerTarget,
  sendTaskToWorkerTarget,
} from "../background-tab/worker-target-service";
import { resetWorkerReadiness, waitForWorkerReady } from "./worker-readiness";
import {
  createCancelledResult,
  createErrorResult,
  type PoolWorker,
  type QueuedTask,
  type WorkerExecutorContext,
  type WorkerTaskResult,
} from "./worker-task.types";
import { isWorkerTabTarget, type WorkerTarget } from "./worker-target";

const READY_TIMEOUT_MS = 20000;
const MAX_EDITOR_STATE_CHANGES = 2;

async function closeWorker(
  context: WorkerExecutorContext,
  worker: PoolWorker,
): Promise<void> {
  const target = worker.target;

  context.retireWorker(worker);

  if (target) {
    if (isWorkerTabTarget(target)) {
      resetWorkerReadiness(target.tabId);
    }

    await closeWorkerTarget(target);
    worker.target = undefined;
  }
}

function cancelStaleWorker(
  context: WorkerExecutorContext,
  worker: PoolWorker,
  queued: QueuedTask,
): void {
  // @keep A stale-generation worker may still be processing a Sitecore callback.
  // @keep Retire it logically without navigating or removing its document.
  context.retireWorker(worker);
  queued.resolve(createCancelledResult(queued.task));
}

async function finishRetiredWorker(
  context: WorkerExecutorContext,
  worker: PoolWorker,
  queued: QueuedTask,
): Promise<void> {
  queued.resolve(createCancelledResult(queued.task));
  await context.destroyRetiredWorker(worker, "active-task-settled");
}

async function retryOrResolveError(
  context: WorkerExecutorContext,
  worker: PoolWorker,
  queued: QueuedTask,
  errorMessage: string,
): Promise<void> {
  await closeWorker(context, worker);

  if (!context.isCurrentGeneration()) {
    queued.resolve(createCancelledResult(queued.task));
  } else if (!queued.retried) {
    queued.retried = true;

    runTaskOnNewWorker(
      context,
      context.createPendingWorker(),
      queued,
    );

    context.scheduleNext();
  } else {
    queued.resolve(createErrorResult(queued.task, errorMessage));
    context.scheduleNext();
  }
}

async function retryAfterDocumentStale(
  context: WorkerExecutorContext,
  worker: PoolWorker,
  queued: QueuedTask,
): Promise<void> {
  const retiredTarget = worker.target;

  if (queued.task.type === "set-editor-state") {
    const retiredWorkerCount = context.retireAllWorkers();

    extensionLog.debug(
      "Worker pool: editor state changed; all current workers retired",
      {
        taskId: queued.task.taskId,
        retiredWorkerCount,
      },
    );
  } else {
    context.retireWorker(worker);
  }

  if (queued.editorStateChangeCount >= MAX_EDITOR_STATE_CHANGES) {
    queued.resolve(
      createErrorResult(
        queued.task,
        `Worker document did not stabilize after ${MAX_EDITOR_STATE_CHANGES} state changes`,
      ),
    );
    context.scheduleNext();
    return;
  }

  queued.editorStateChangeCount += 1;

  extensionLog.debug(
    "Worker pool: document stale; worker retired; retrying task on fresh worker",
    {
      taskId: queued.task.taskId,
      taskType: queued.task.type,
      editorStateChangeCount: queued.editorStateChangeCount,
      retiredWorkerKey: retiredTarget
        ? getWorkerTargetKey(retiredTarget)
        : undefined,
    },
  );

  runTaskOnNewWorker(
    context,
    context.createPendingWorker(),
    queued,
  );

  context.scheduleNext();
}
async function runTaskOnWorker(
  context: WorkerExecutorContext,
  worker: PoolWorker,
  queued: QueuedTask,
): Promise<void> {
  const target = worker.target;

  if (!target || isWorkerRetired(worker) || !context.isCurrentGeneration()) {
    cancelStaleWorker(context, worker, queued);
    return;
  }

  worker.state = "busy";

  const workerKey = getWorkerTargetKey(target);
  context.activeTaskByWorkerKey.set(workerKey, {
    target,
    requestId: queued.task.requestId,
    taskId: queued.task.taskId,
  });

  let executionResult:
    | Awaited<ReturnType<typeof sendTaskToWorkerTarget>>
    | undefined;

  try {
    extensionLog.debug(`Worker pool[${workerKey}]: executing task`, {
      workerKey,
      taskId: queued.task.taskId,
      taskType: queued.task.type,
      url: queued.task.url,
    });

    executionResult = await sendTaskToWorkerTarget(target, queued.task);
  } catch (error) {
    extensionLog.warn("Worker pool: task execution failed", {
      workerKey,
      task: queued.task,
      error,
    });
  }

  context.activeTaskByWorkerKey.delete(workerKey);

  extensionLog.debug(
    `Worker pool[${workerKey}]: task returned` +
    ` taskId=${queued.task.taskId}` +
    ` taskType=${queued.task.type}` +
    ` resultStatus=${String(executionResult?.status)}` +
    ` resultType=${String(executionResult?.type)}` +
    ` editorStateChangeCount=${queued.editorStateChangeCount}`,
  );

  if (isWorkerRetired(worker) || !context.isCurrentGeneration()) {
    await finishRetiredWorker(context, worker, queued);
    return;
  }

  if (context.cancelledRequestIds.has(queued.task.requestId)) {
    context.retireWorker(worker);
    queued.resolve(createCancelledResult(queued.task));
    await context.destroyRetiredWorker(worker, "cancelled-task-settled");
    context.scheduleNext();
    return;
  }

  if (executionResult?.status === "document-stale") {
    extensionLog.debug(
      `Worker pool: document-stale result intercepted` +
      ` taskId=${queued.task.taskId}` +
      ` taskType=${queued.task.type}` +
      ` editorStateChangeCount=${queued.editorStateChangeCount}`,
    );

    await retryAfterDocumentStale(context, worker, queued);
    return;
  }

  const result: WorkerTaskResult | undefined = executionResult;

  if (!result) {
    await retryOrResolveError(
      context,
      worker,
      queued,
      "Worker task failed with no result",
    );
    return;
  }

  worker.state = "idle";
  queued.resolve(result);
  context.scheduleNext();
}

async function prepareCreatedTarget(
  context: WorkerExecutorContext,
  worker: PoolWorker,
  queued: QueuedTask,
  target: WorkerTarget,
): Promise<boolean> {
  worker.target = target;
  worker.currentUrl = queued.task.url;

  if (isWorkerTabTarget(target)) {
    await waitForWorkerReady(
      target.tabId,
      READY_TIMEOUT_MS,
    );
  }

  if (
    isWorkerRetired(worker) ||
    !context.isCurrentGeneration()
  ) {
    cancelStaleWorker(context, worker, queued);
    return false;
  }

  await markWorkerTargetOwned(target);

  if (
    isWorkerRetired(worker) ||
    !context.isCurrentGeneration()
  ) {
    cancelStaleWorker(context, worker, queued);
    return false;
  }

  worker.state = "busy";
  return true;
}

async function runOnNewWorker(
  context: WorkerExecutorContext,
  worker: PoolWorker,
  queued: QueuedTask,
): Promise<void> {
  let target: WorkerTarget | undefined;

  try {
    target = await createWorkerTarget(
      queued.hostTabId,
      queued.task.url,
      REFERENCE_GRAPH.DEBUG_BACKGROUND_HARVEST,
    );
  } catch (error) {
    extensionLog.warn(
      "Worker pool: failed to create worker",
      {
        hostTabId: queued.hostTabId,
        task: queued.task,
        error,
      },
    );
  }

  if (
    isWorkerRetired(worker) ||
    !context.isCurrentGeneration()
  ) {
    if (target) {
      worker.target = target;
    }

    cancelStaleWorker(context, worker, queued);
    return;
  }

  if (!target) {
    await retryOrResolveError(
      context,
      worker,
      queued,
      "Failed to create worker",
    );

    return;
  }

  try {
    const ready = await prepareCreatedTarget(
      context,
      worker,
      queued,
      target,
    );

    if (ready) {
      await runTaskOnWorker(
        context,
        worker,
        queued,
      );
    }
  } catch (error) {
    extensionLog.warn(
      "Worker pool: worker failed to become ready",
      {
        target,
        task: queued.task,
        retried: queued.retried,
        error,
      },
    );

    if (isWorkerRetired(worker)) {
      queued.resolve(createCancelledResult(queued.task));
      await context.destroyRetiredWorker(worker, "worker-ready-failed-after-retirement");
      return;
    }

    await retryOrResolveError(
      context,
      worker,
      queued,
      "Worker failed to become ready",
    );
  }
}

function isWorkerRetired(worker: PoolWorker): boolean {
  return worker.state === "retired";
}

async function navigateExistingWorker(
  context: WorkerExecutorContext,
  worker: PoolWorker,
  queued: QueuedTask,
): Promise<boolean> {
  const target = worker.target;

  if (!target || isWorkerRetired(worker)) {
    return false;
  }

  if (isWorkerTabTarget(target)) {
    resetWorkerReadiness(target.tabId);
  }

  const updatedTarget = await navigateWorkerTarget(
    target,
    queued.task.url,
  );

  if (
    isWorkerRetired(worker) ||
    !context.isCurrentGeneration()
  ) {
    cancelStaleWorker(context, worker, queued);
    return false;
  }

  worker.target = updatedTarget;

  if (isWorkerTabTarget(updatedTarget)) {
    await waitForWorkerReady(
      updatedTarget.tabId,
      READY_TIMEOUT_MS,
    );
  }

  if (
    isWorkerRetired(worker) ||
    !context.isCurrentGeneration()
  ) {
    cancelStaleWorker(context, worker, queued);
    return false;
  }

  await markWorkerTargetOwned(updatedTarget);

  if (
    isWorkerRetired(worker) ||
    !context.isCurrentGeneration()
  ) {
    cancelStaleWorker(context, worker, queued);
    return false;
  }

  worker.currentUrl = queued.task.url;
  worker.state = "busy";

  return true;
}

export async function runWorkerTask(
  context: WorkerExecutorContext,
  worker: PoolWorker,
  queued: QueuedTask,
): Promise<void> {
  let canRunTask =
    context.isCurrentGeneration() &&
    !isWorkerRetired(worker) &&
    worker.target !== undefined;

  if (
    canRunTask &&
    worker.currentUrl !== queued.task.url
  ) {
    try {
      canRunTask = await navigateExistingWorker(
        context,
        worker,
        queued,
      );
    } catch (error) {
      canRunTask = false;

      extensionLog.warn(
        "Worker pool: failed to navigate worker",
        {
          target: worker.target,
          task: queued.task,
          retried: queued.retried,
          error,
        },
      );

      if (isWorkerRetired(worker)) {
        queued.resolve(
          createCancelledResult(queued.task),
        );
      } else {
        await retryOrResolveError(
          context,
          worker,
          queued,
          "Worker failed to navigate",
        );
      }
    }
  }

  if (
    canRunTask &&
    context.isCurrentGeneration() &&
    !isWorkerRetired(worker)
  ) {
    await runTaskOnWorker(
      context,
      worker,
      queued,
    );
  }
}

export function runTaskOnNewWorker(
  context: WorkerExecutorContext,
  worker: PoolWorker,
  queued: QueuedTask,
): void {
  void runOnNewWorker(
    context,
    worker,
    queued,
  );
}