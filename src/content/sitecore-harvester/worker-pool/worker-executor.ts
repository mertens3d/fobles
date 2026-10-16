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
  resolve: (
    result: WorkerTaskResult,
  ) => void;
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
  createPendingWorker:
    () => PoolWorker;
  removeWorker: (
    worker: PoolWorker,
  ) => void;
  scheduleNext: () => void;
  isCurrentGeneration:
    () => boolean;
};

async function closeStaleWorker(
  context: WorkerExecutorContext,
  worker: PoolWorker,
): Promise<void> {
  const tabId = worker.tabId;

  context.removeWorker(worker);

  if (tabId !== -1) {
    context.activeTaskByTabId.delete(
      tabId,
    );

    resetWorkerReadiness(tabId);

    await closeWorkerTab(tabId);
  }
}

async function retryOrResolveError(
  context: WorkerExecutorContext,
  worker: PoolWorker,
  queued: QueuedTask,
  errorMessage: string,
): Promise<void> {
  const tabId = worker.tabId;

  context.removeWorker(worker);

  if (tabId !== -1) {
    context.activeTaskByTabId.delete(
      tabId,
    );

    resetWorkerReadiness(tabId);

    await closeWorkerTab(tabId);
  }

  if (
    !context.isCurrentGeneration()
  ) {
    queued.resolve(
      createCancelledResult(
        queued.task,
      ),
    );
  } else if (!queued.retried) {
    queued.retried = true;

    void runOnNewWorker(
      context,
      context.createPendingWorker(),
      queued,
    );

    context.scheduleNext();
  } else {
    queued.resolve(
      createErrorResult(
        queued.task,
        errorMessage,
      ),
    );

    context.scheduleNext();
  }
}

async function runTaskOnWorkerTab(
  context: WorkerExecutorContext,
  worker: PoolWorker,
  queued: QueuedTask,
): Promise<void> {
  if (
    !context.isCurrentGeneration()
  ) {
    await closeStaleWorker(
      context,
      worker,
    );

    queued.resolve(
      createCancelledResult(
        queued.task,
      ),
    );

    return;
  }

  context.activeTaskByTabId.set(
    worker.tabId,
    {
      requestId:
        queued.task.requestId,
      taskId:
        queued.task.taskId,
    },
  );

  let result:
    | WorkerTaskResult
    | undefined = undefined;

  try {
    result =
      await sendTaskToWorkerTab(
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
    !context.isCurrentGeneration()
  ) {
    await closeStaleWorker(
      context,
      worker,
    );

    queued.resolve(
      createCancelledResult(
        queued.task,
      ),
    );
  } else if (
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
  const tabId =
    await createWorkerTab(
      queued.task.url,
      REFERENCE_GRAPH
        .DEBUG_BACKGROUND_HARVEST,
    );

  if (
    !context.isCurrentGeneration()
  ) {
    if (tabId !== undefined) {
      worker.tabId = tabId;

      await closeStaleWorker(
        context,
        worker,
      );
    } else {
      context.removeWorker(worker);
    }

    queued.resolve(
      createCancelledResult(
        queued.task,
      ),
    );

    return;
  }

  if (tabId === undefined) {
    await retryOrResolveError(
      context,
      worker,
      queued,
      "Failed to create worker tab",
    );

    return;
  }

  worker.tabId = tabId;
  worker.currentUrl =
    queued.task.url;

  try {
    await waitForWorkerReady(
      tabId,
      READY_TIMEOUT_MS,
    );

    if (
      !context.isCurrentGeneration()
    ) {
      await closeStaleWorker(
        context,
        worker,
      );

      queued.resolve(
        createCancelledResult(
          queued.task,
        ),
      );

      return;
    }

    await markWorkerTabOwned(
      tabId,
    );

    if (
      !context.isCurrentGeneration()
    ) {
      await closeStaleWorker(
        context,
        worker,
      );

      queued.resolve(
        createCancelledResult(
          queued.task,
        ),
      );

      return;
    }

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

export async function runWorkerTask(
  context: WorkerExecutorContext,
  worker: PoolWorker,
  queued: QueuedTask,
): Promise<void> {
  let canRunTask =
    context.isCurrentGeneration();

  if (
    canRunTask &&
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

      if (
        !context.isCurrentGeneration()
      ) {
        canRunTask = false;

        await closeStaleWorker(
          context,
          worker,
        );

        queued.resolve(
          createCancelledResult(
            queued.task,
          ),
        );
      } else {
        await waitForWorkerReady(
          worker.tabId,
          READY_TIMEOUT_MS,
        );

        if (
          !context.isCurrentGeneration()
        ) {
          canRunTask = false;

          await closeStaleWorker(
            context,
            worker,
          );

          queued.resolve(
            createCancelledResult(
              queued.task,
            ),
          );
        } else {
          await markWorkerTabOwned(
            worker.tabId,
          );

          worker.currentUrl =
            queued.task.url;
        }
      }
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

  if (
    canRunTask &&
    context.isCurrentGeneration()
  ) {
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