// @source-path [fobles] src/content/sitecore-harvester/worker-pool/worker-executor.ts

import { REFERENCE_GRAPH } from "../../../constants/graph.const";
import { extensionLog } from "../../logger";
import {
  closeWorkerTab,
  createWorkerTab,
  markWorkerTabOwned,
  navigateWorkerTab,
  sendTaskToWorkerTab,
} from "../background-tab/worker-tab-service";
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

const READY_TIMEOUT_MS = 20000;

export type PoolWorker = {
  tabId: number;
  status: "idle" | "busy";
  currentUrl: string | undefined;
};

export type QueuedTask = {
  task: WorkerTask;
  retried: boolean;
  resolve: (result: WorkerTaskResult) => void;
};

export type WorkerExecutorContext = {
  activeTaskByTabId: Map<
    number,
    {
      requestId: string;
      taskId: string;
    }
  >;
  cancelledRequestIds: Set<string>;
  createPendingWorker: () => PoolWorker;
  removeWorker: (worker: PoolWorker) => void;
  scheduleNext: () => void;
};

async function retryOrResolveError(
  context: WorkerExecutorContext,
  worker: PoolWorker,
  queued: QueuedTask,
  errorMessage: string,
): Promise<void> {
  const tabId = worker.tabId;

  context.removeWorker(worker);

  if (tabId !== -1) {
    resetWorkerReadiness(tabId);
    await closeWorkerTab(tabId);
  }

  if (!queued.retried) {
    queued.retried = true;

    void runOnNewWorker(
      context,
      context.createPendingWorker(),
      queued,
    );
  } else {
    queued.resolve(
      createErrorResult(
        queued.task,
        errorMessage,
      ),
    );
  }

  context.scheduleNext();
}

async function runTaskOnWorkerTab(
  context: WorkerExecutorContext,
  worker: PoolWorker,
  queued: QueuedTask,
): Promise<void> {
  context.activeTaskByTabId.set(
    worker.tabId,
    {
      requestId: queued.task.requestId,
      taskId: queued.task.taskId,
    },
  );

  let result: WorkerTaskResult | undefined =
    undefined;

  try {
    result = await sendTaskToWorkerTab(
      worker.tabId,
      queued.task,
    );
  } catch (error) {
    extensionLog.warn(
      "Worker pool: task execution failed",
      {
        tabId: worker.tabId,
        task: queued.task,
        error,
      },
    );
  }

  context.activeTaskByTabId.delete(
    worker.tabId,
  );

  if (
    context.cancelledRequestIds.has(
      queued.task.requestId,
    )
  ) {
    worker.status = "idle";

    queued.resolve(
      createCancelledResult(
        queued.task,
      ),
    );

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

async function runOnNewWorker(
  context: WorkerExecutorContext,
  worker: PoolWorker,
  queued: QueuedTask,
): Promise<void> {
  const tabId = await createWorkerTab(
    queued.task.url,
    REFERENCE_GRAPH.DEBUG_BACKGROUND_HARVEST,
  );

  if (tabId === undefined) {
    await retryOrResolveError(
      context,
      worker,
      queued,
      "Failed to create worker tab",
    );
  } else {
    worker.tabId = tabId;
    worker.currentUrl = queued.task.url;

    try {
      await waitForWorkerReady(
        tabId,
        READY_TIMEOUT_MS,
      );

      await markWorkerTabOwned(tabId);

      await runTaskOnWorkerTab(
        context,
        worker,
        queued,
      );
    } catch (error) {
      extensionLog.warn(
        "Worker pool: worker tab failed to become ready",
        {
          tabId,
          task: queued.task,
          retried: queued.retried,
          error,
        },
      );

      await retryOrResolveError(
        context,
        worker,
        queued,
        "Worker tab failed to become ready",
      );
    }
  }
}

export async function runWorkerTask(
  context: WorkerExecutorContext,
  worker: PoolWorker,
  queued: QueuedTask,
): Promise<void> {
  let canRunTask = true;

  if (
    worker.currentUrl !==
    queued.task.url
  ) {
    resetWorkerReadiness(
      worker.tabId,
    );

    try {
      await navigateWorkerTab(
        worker.tabId,
        queued.task.url,
      );

      await waitForWorkerReady(
        worker.tabId,
        READY_TIMEOUT_MS,
      );

      await markWorkerTabOwned(
        worker.tabId,
      );

      worker.currentUrl =
        queued.task.url;
    } catch (error) {
      canRunTask = false;

      extensionLog.warn(
        "Worker pool: failed to navigate worker tab",
        {
          tabId: worker.tabId,
          task: queued.task,
          retried: queued.retried,
          error,
        },
      );

      await retryOrResolveError(
        context,
        worker,
        queued,
        "Worker tab failed to navigate",
      );
    }
  }

  if (canRunTask) {
    await runTaskOnWorkerTab(
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