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
import {
  resetWorkerReadiness,
  waitForWorkerReady,
} from "./worker-readiness";
import {
  createCancelledResult,
  createErrorResult,
  type WorkerTask,
  type WorkerTaskResult,
} from "./worker-task.types";
import {
  isWorkerTabTarget,
  type WorkerTarget,
} from "./worker-target";

const READY_TIMEOUT_MS = 20000;

export type PoolWorker = {
  target: WorkerTarget | undefined;
  status: "idle" | "busy";
  currentUrl: string | undefined;
};

export type QueuedTask = {
  task: WorkerTask;
  hostTabId: number | undefined;
  retried: boolean;
  resolve: (result: WorkerTaskResult) => void;
};

export type ActiveWorkerTask = {
  target: WorkerTarget;
  requestId: string;
  taskId: string;
};

export type WorkerExecutorContext = {
  activeTaskByWorkerKey: Map<string, ActiveWorkerTask>;
  cancelledRequestIds: Set<string>;
  createPendingWorker: () => PoolWorker;
  removeWorker: (worker: PoolWorker) => void;
  scheduleNext: () => void;
  isCurrentGeneration: () => boolean;
};

async function closeWorker(
  context: WorkerExecutorContext,
  worker: PoolWorker,
): Promise<void> {
  const target = worker.target;

  context.removeWorker(worker);

  if (target) {
    context.activeTaskByWorkerKey.delete(
      getWorkerTargetKey(target),
    );

    if (isWorkerTabTarget(target)) {
      resetWorkerReadiness(target.tabId);
    }

    await closeWorkerTarget(target);
    worker.target = undefined;
  }
}

async function cancelStaleWorker(
  context: WorkerExecutorContext,
  worker: PoolWorker,
  queued: QueuedTask,
): Promise<void> {
  await closeWorker(context, worker);
  queued.resolve(createCancelledResult(queued.task));
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

async function runTaskOnWorker(
  context: WorkerExecutorContext,
  worker: PoolWorker,
  queued: QueuedTask,
): Promise<void> {
  const target = worker.target;

  if (!target || !context.isCurrentGeneration()) {
    await cancelStaleWorker(context, worker, queued);
    return;
  }

  const workerKey = getWorkerTargetKey(target);

  context.activeTaskByWorkerKey.set(workerKey, {
    target,
    requestId: queued.task.requestId,
    taskId: queued.task.taskId,
  });

  let result: WorkerTaskResult | undefined;

  try {

    extensionLog.debug(`Worker pool[${workerKey}]: executing task`, {
      workerKey: getWorkerTargetKey(target),
      taskId: queued.task.taskId,
      taskType: queued.task.type,
      url: queued.task.url,
    });


    result = await sendTaskToWorkerTarget(target, queued.task);
  } catch (error) {
    extensionLog.warn("Worker pool: task execution failed", {
      workerKey,
      task: queued.task,
      error,
    });
  }

  context.activeTaskByWorkerKey.delete(workerKey);

  extensionLog.debug(`Worker pool[${workerKey}]: task completed`, {
  taskId: queued.task.taskId,
  taskType: queued.task.type,
  resultStatus: result?.status,
});


  if (!context.isCurrentGeneration()) {
    await cancelStaleWorker(context, worker, queued);
  } else if (context.cancelledRequestIds.has(queued.task.requestId)) {
    
    
    extensionLog.debug(`Worker pool[${workerKey}]: becoming idle`);
    
    worker.status = "idle";
    queued.resolve(createCancelledResult(queued.task));
    context.scheduleNext();
  } else if (!result) {
    await retryOrResolveError(
      context,
      worker,
      queued,
      "Worker task failed with no result",
    );
  } else {
    worker.status = "idle";
    queued.resolve(result);
    context.scheduleNext();
  }
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
    await waitForWorkerReady(target.tabId, READY_TIMEOUT_MS);
  }

  if (!context.isCurrentGeneration()) {
    await cancelStaleWorker(context, worker, queued);
    return false;
  }

  await markWorkerTargetOwned(target);

  if (!context.isCurrentGeneration()) {
    await cancelStaleWorker(context, worker, queued);
    return false;
  }

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
    extensionLog.warn("Worker pool: failed to create worker", {
      hostTabId: queued.hostTabId,
      task: queued.task,
      error,
    });
  }

  if (!context.isCurrentGeneration()) {
    if (target) {
      worker.target = target;
    }

    await cancelStaleWorker(context, worker, queued);
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
      await runTaskOnWorker(context, worker, queued);
    }
  } catch (error) {
    extensionLog.warn("Worker pool: worker failed to become ready", {
      target,
      task: queued.task,
      retried: queued.retried,
      error,
    });

    await retryOrResolveError(
      context,
      worker,
      queued,
      "Worker failed to become ready",
    );
  }
}

async function navigateExistingWorker(
  context: WorkerExecutorContext,
  worker: PoolWorker,
  queued: QueuedTask,
): Promise<boolean> {
  const target = worker.target;

  if (!target) {
    return false;
  }

  if (isWorkerTabTarget(target)) {
    resetWorkerReadiness(target.tabId);
  }

  const updatedTarget = await navigateWorkerTarget(
    target,
    queued.task.url,
  );

  worker.target = updatedTarget;

  if (isWorkerTabTarget(updatedTarget)) {
    await waitForWorkerReady(
      updatedTarget.tabId,
      READY_TIMEOUT_MS,
    );
  }

  if (!context.isCurrentGeneration()) {
    await cancelStaleWorker(context, worker, queued);
    return false;
  }

  await markWorkerTargetOwned(updatedTarget);
  worker.currentUrl = queued.task.url;

  return true;
}

export async function runWorkerTask(
  context: WorkerExecutorContext,
  worker: PoolWorker,
  queued: QueuedTask,
): Promise<void> {
  let canRunTask =
    context.isCurrentGeneration() &&
    worker.target !== undefined;

  if (canRunTask && worker.currentUrl !== queued.task.url) {
    try {
      canRunTask = await navigateExistingWorker(
        context,
        worker,
        queued,
      );
    } catch (error) {
      canRunTask = false;

      extensionLog.warn("Worker pool: failed to navigate worker", {
        target: worker.target,
        task: queued.task,
        retried: queued.retried,
        error,
      });

      await retryOrResolveError(
        context,
        worker,
        queued,
        "Worker failed to navigate",
      );
    }
  }

  if (canRunTask && context.isCurrentGeneration()) {
    await runTaskOnWorker(context, worker, queued);
  }
}

export function runTaskOnNewWorker(
  context: WorkerExecutorContext,
  worker: PoolWorker,
  queued: QueuedTask,
): void {
  void runOnNewWorker(context, worker, queued);
}