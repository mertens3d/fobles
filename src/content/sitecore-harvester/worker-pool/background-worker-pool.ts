// @source-path [fobles] src/content/sitecore-harvester/worker-pool/background-worker-pool.ts

import { REFERENCE_GRAPH } from "../../../constants/graph.const";
import { extensionLog } from "../../logger";
import {
  closeWorkerTab,
  sendCancelToWorkerTab,
} from "../background-tab/worker-tab-service";
import {
  runTaskOnNewWorker,
  runWorkerTask,
  type PoolWorker,
  type QueuedTask,
  type WorkerExecutorContext,
} from "./worker-executor";
import {
  getWorkerPoolMaxWorkers,
  onWorkerPoolMaxWorkersChange,
} from "./worker-pool-settings";
import {
  clearWorkerReadiness,
  markWorkerReady,
  resetWorkerReadiness,
} from "./worker-readiness";
import {
  createCancelledResult,
  type WorkerTask,
  type WorkerTaskResult,
} from "./worker-task.types";

let maxWorkers =
  REFERENCE_GRAPH.WORKER_POOL.MAX_WORKERS;

let workers: PoolWorker[] = [];
let queue: QueuedTask[] = [];

const cancelledRequestIds =
  new Set<string>();

const activeTaskByTabId =
  new Map<
    number,
    {
      requestId: string;
      taskId: string;
    }
  >();

void initializeWorkerPoolSettings();

onWorkerPoolMaxWorkersChange(
  (newMaxWorkers) => {
    maxWorkers = newMaxWorkers;

    extensionLog.debug(
      "Worker pool: maximum worker count changed",
      {
        maxWorkers,
        workerCount: workers.length,
        queueLength: queue.length,
      },
    );

    scheduleNext();
  },
);

async function initializeWorkerPoolSettings():
  Promise<void> {
  maxWorkers =
    await getWorkerPoolMaxWorkers();

  extensionLog.debug(
    "Worker pool: settings initialized",
    {
      maxWorkers,
    },
  );

  scheduleNext();
}

function removeWorker(
  worker: PoolWorker,
): void {
  workers = workers.filter(
    (candidate) =>
      candidate !== worker,
  );
}

function createPendingWorker():
  PoolWorker {
  const worker: PoolWorker = {
    tabId: -1,
    status: "busy",
    currentUrl: undefined,
  };

  workers.push(worker);

  return worker;
}

function createExecutorContext():
  WorkerExecutorContext {
  return {
    activeTaskByTabId,
    cancelledRequestIds,
    createPendingWorker,
    removeWorker,
    scheduleNext,
  };
}

export function handleWorkerReady(
  tabId: number | undefined,
): void {
  markWorkerReady(tabId);
}

export function handleWorkerTabRemoved(
  tabId: number,
): void {
  const worker = workers.find(
    (candidate) =>
      candidate.tabId === tabId,
  );

  if (worker) {
    removeWorker(worker);
  }

  activeTaskByTabId.delete(tabId);
  resetWorkerReadiness(tabId);
  scheduleNext();
}

function scheduleNext(): void {
  let scheduling = true;

  while (
    scheduling &&
    queue.length > 0
  ) {
    const next = queue[0];

    if (
      cancelledRequestIds.has(
        next.task.requestId,
      )
    ) {
      queue.shift();

      next.resolve(
        createCancelledResult(
          next.task,
        ),
      );
    } else {
      const idleWorker =
        workers.find(
          (worker) =>
            worker.status === "idle",
        );

      if (idleWorker) {
        queue.shift();

        idleWorker.status = "busy";

        void runWorkerTask(
          createExecutorContext(),
          idleWorker,
          next,
        );
      } else if (
        workers.length <
        maxWorkers
      ) {
        queue.shift();

        runTaskOnNewWorker(
          createExecutorContext(),
          createPendingWorker(),
          next,
        );
      } else {
        scheduling = false;
      }
    }
  }
}
export async function runPoolTask(
  task: WorkerTask,
): Promise<WorkerTaskResult> {
  maxWorkers =
    await getWorkerPoolMaxWorkers();

  extensionLog.debug(
    "Worker pool: settings loaded for task",
    {
      maxWorkers,
    },
  );

  return new Promise(
    (resolve) => {
      queue.push({
        task,
        retried: false,
        resolve,
      });

      extensionLog.debug(
        `Worker pool: task queued - maxWorkers=${maxWorkers}, workers=${workers.length}, queue=${queue.length}`,
        {
          taskType: task.type,
          taskId: task.taskId,
          requestId: task.requestId,
          maxWorkers,
          workerCount: workers.length,
          queueLength: queue.length,
        },
      );

      scheduleNext();
    },
  );
}

export function cancelPoolRequest(
  requestId: string,
): void {
  cancelledRequestIds.add(
    requestId,
  );

  queue = queue.filter(
    (queued) => {
      let keepTask = true;

      if (
        queued.task.requestId ===
        requestId
      ) {
        queued.resolve(
          createCancelledResult(
            queued.task,
          ),
        );

        keepTask = false;
      }

      return keepTask;
    },
  );

  activeTaskByTabId.forEach(
    (active, tabId) => {
      if (
        active.requestId ===
        requestId
      ) {
        sendCancelToWorkerTab(
          tabId,
          active.requestId,
          active.taskId,
        );
      }
    },
  );
}

export function adoptWorkerTab(
  tabId: number | undefined,
): void {
  if (tabId !== undefined) {
    const worker = workers.find(
      (candidate) =>
        candidate.tabId === tabId,
    );

    if (worker) {
      removeWorker(worker);
      resetWorkerReadiness(tabId);
      activeTaskByTabId.delete(tabId);

      extensionLog.debug(
        "Worker pool: tab adopted by user",
        {
          tabId,
        },
      );

      scheduleNext();
    }
  }
}

export async function disposeWorkerPool():
  Promise<void> {
  const tabIds = workers
    .filter(
      (worker) =>
        worker.tabId !== -1,
    )
    .map(
      (worker) =>
        worker.tabId,
    );

  workers = [];

  queue.forEach(
    (queued) => {
      queued.resolve(
        createCancelledResult(
          queued.task,
        ),
      );
    },
  );

  queue = [];

  activeTaskByTabId.clear();
  cancelledRequestIds.clear();
  clearWorkerReadiness();

  await Promise.all(
    tabIds.map(
      (tabId) =>
        closeWorkerTab(tabId),
    ),
  );
}