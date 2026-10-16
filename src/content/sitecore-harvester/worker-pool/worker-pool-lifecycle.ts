// @source-path [fobles] src/content/sitecore-harvester/worker-pool/worker-pool-lifecycle.ts

import {
  extensionLog,
} from "../../logger";
import {
  closeWorkerTab,
  sendCancelToWorkerTab,
} from "../background-tab/worker-tab-service";
import {
  clearWorkerReadiness,
} from "./worker-readiness";
import {
  createCancelledResult,
} from "./worker-task.types";
import type {
  PoolWorker,
  QueuedTask,
} from "./worker-executor";

type ActiveTask = {
  requestId: string;
  taskId: string;
};

type DisposeWorkerPoolOptions = {
  workers: PoolWorker[];
  queue: QueuedTask[];
  activeTaskByTabId:
    Map<number, ActiveTask>;
  cancelledRequestIds:
    Set<string>;
  generation: number;
};

export type WorkerPoolDisposalResult = {
  generation: number;
};

let poolGeneration = 0;

export function getWorkerPoolGeneration():
  number {
  return poolGeneration;
}

export function isWorkerPoolGenerationCurrent(
  generation: number,
): boolean {
  return (
    generation ===
    poolGeneration
  );
}

export async function disposeWorkerPoolLifecycle({
  workers,
  queue,
  activeTaskByTabId,
  cancelledRequestIds,
  generation,
}: DisposeWorkerPoolOptions):
  Promise<WorkerPoolDisposalResult> {
  let nextGeneration =
    poolGeneration;

  if (
    generation ===
    poolGeneration
  ) {
    poolGeneration += 1;
    nextGeneration =
      poolGeneration;
  }

  const tabIds =
    collectWorkerTabIds(
      workers,
    );

  queue.forEach((queued) => {
    queued.resolve(
      createCancelledResult(
        queued.task,
      ),
    );
  });

  activeTaskByTabId.forEach(
    (active, tabId) => {
      cancelledRequestIds.add(
        active.requestId,
      );

      sendCancelToWorkerTab(
        tabId,
        active.requestId,
        active.taskId,
      );
    },
  );

  activeTaskByTabId.clear();
  clearWorkerReadiness();

  extensionLog.debug(
    "Worker pool: disposing",
    {
      previousGeneration:
        generation,
      nextGeneration,
      workerCount:
        workers.length,
      queuedTaskCount:
        queue.length,
      tabIds,
    },
  );

  await Promise.all(
    tabIds.map(
      async (tabId) => {
        await closeWorkerTab(
          tabId,
        );
      },
    ),
  );

  cancelledRequestIds.clear();

  extensionLog.debug(
    "Worker pool: disposed",
    {
      generation:
        nextGeneration,
      closedTabIds:
        tabIds,
    },
  );

  return {
    generation:
      nextGeneration,
  };
}

function collectWorkerTabIds(
  workers:
    readonly PoolWorker[],
): number[] {
  const tabIds =
    workers
      .filter(
        (worker) =>
          worker.tabId !== -1,
      )
      .map(
        (worker) =>
          worker.tabId,
      );

  return Array.from(
    new Set(tabIds),
  );
}