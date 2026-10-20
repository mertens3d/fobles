// @source-path [fobles] src/content/sitecore-harvester/worker-pool/background-worker-pool.ts

import { REFERENCE_GRAPH } from "../../../constants/graph.const";
import { extensionLog } from "../../logger";
import { sendCancelToWorkerTarget } from "../background-tab/worker-target-service";
import {
  runTaskOnNewWorker,
  runWorkerTask,
} from "./worker-executor";
import {
  type ActiveWorkerTask,
  type PoolWorker,
  type QueuedTask,
  type WorkerExecutorContext
} from "./worker-task.types";
import {
  disposeWorkerPoolLifecycle,
  getWorkerPoolGeneration,
  isWorkerPoolGenerationCurrent,
} from "./worker-pool-lifecycle";
import {
  getWorkerPoolMaxWorkers,
  onWorkerPoolMaxWorkersChange,
} from "./worker-pool-settings";
import {
  markWorkerReady,
  resetWorkerReadiness,
} from "./worker-readiness";
import {
  createCancelledResult,
  type WorkerTask,
  type WorkerTaskResult,
} from "./worker-task.types";
import { isWorkerTabTarget } from "./worker-target";
import { CONST } from "../../../constants/const";
import { DEFAULT_RUNTIME_SETTINGS } from "../../runtime-settings/runtime-settings";

let maxWorkers = DEFAULT_RUNTIME_SETTINGS.workerPool.maxWorkers;
let workers: PoolWorker[] = [];
let queue: QueuedTask[] = [];

const cancelledRequestIds = new Set<string>();
const activeTaskByWorkerKey = new Map<string, ActiveWorkerTask>();

void initializeWorkerPoolSettings();

onWorkerPoolMaxWorkersChange((newMaxWorkers) => {
  maxWorkers = newMaxWorkers;

  extensionLog.debug("Worker pool: maximum worker count changed", {
    maxWorkers,
    workerCount: workers.length,
    queueLength: queue.length,
  });

  scheduleNext();
});

async function initializeWorkerPoolSettings(): Promise<void> {
  maxWorkers = await getWorkerPoolMaxWorkers();

  extensionLog.debug("Worker pool: settings initialized", {
    maxWorkers,
  });

  scheduleNext();
}

function removeWorker(worker: PoolWorker): void {
  workers = workers.filter((candidate) => candidate !== worker);
}

function createPendingWorker(): PoolWorker {
  const worker: PoolWorker = {
    target: undefined,
    status: "busy",
    currentUrl: undefined,
  };

  workers.push(worker);

  return worker;
}

function createExecutorContext(): WorkerExecutorContext {
  const generation = getWorkerPoolGeneration();

  return {
    activeTaskByWorkerKey,
    cancelledRequestIds,
    createPendingWorker,
    removeWorker,
    scheduleNext,
    isCurrentGeneration: () =>
      isWorkerPoolGenerationCurrent(generation),
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
      candidate.target !== undefined &&
      isWorkerTabTarget(candidate.target) &&
      candidate.target.tabId === tabId,
  );

  if (worker?.target) {
    removeWorker(worker);
    activeTaskByWorkerKey.delete(`tab:${tabId}`);
  }

  resetWorkerReadiness(tabId);
  scheduleNext();
}

function scheduleNext(): void {
  let scheduling = true;

  while (scheduling && queue.length > 0) {
    const next = queue[0];

    if (cancelledRequestIds.has(next.task.requestId)) {
      queue.shift();
      next.resolve(createCancelledResult(next.task));
    } else {
      const idleWorker = workers.find(
        (worker) => worker.status === "idle",
      );

      if (idleWorker) {
        queue.shift();
        idleWorker.status = "busy";
        void runWorkerTask(
          createExecutorContext(),
          idleWorker,
          next,
        );
      } else if (workers.length < maxWorkers) {
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
  hostTabId: number | undefined,
): Promise<WorkerTaskResult> {
  maxWorkers = await getWorkerPoolMaxWorkers();

  return await new Promise<WorkerTaskResult>((resolve) => {
    if (cancelledRequestIds.has(task.requestId)) {
      resolve(createCancelledResult(task));
      return;
    }

    queue.push({
      task,
      hostTabId,
      retried: false,
      editorStateChangeCount: 0,
      resolve,
    });

    extensionLog.debug(
      `Worker pool: task queued - maxWorkers=${maxWorkers}, workers=${workers.length}, queue=${queue.length}`,
      {
        requestId: task.requestId,
        taskId: task.taskId,
        taskType: task.type,
        hostTabId,
        maxWorkers,
        workerCount: workers.length,
        queueLength: queue.length,
        poolGeneration: getWorkerPoolGeneration(),
      },
    );

    scheduleNext();
  });
}

export function cancelPoolRequest(
  requestId: string,
): void {
  cancelledRequestIds.add(requestId);

  queue = queue.filter((queued) => {
    let keepTask = true;

    if (queued.task.requestId === requestId) {
      queued.resolve(createCancelledResult(queued.task));
      keepTask = false;
    }

    return keepTask;
  });

  activeTaskByWorkerKey.forEach((active) => {
    if (active.requestId === requestId) {
      sendCancelToWorkerTarget(
        active.target,
        active.requestId,
        active.taskId,
      );
    }
  });

  scheduleNext();
}

export function cancelPoolTask(
  requestId: string,
  taskId: string,
): void {
  queue = queue.filter((queued) => {
    const matches =
      queued.task.requestId === requestId &&
      queued.task.taskId === taskId;

    if (matches) {
      queued.resolve(createCancelledResult(queued.task));
    }

    return !matches;
  });

  activeTaskByWorkerKey.forEach((active) => {
    if (
      active.requestId === requestId &&
      active.taskId === taskId
    ) {
      sendCancelToWorkerTarget(
        active.target,
        active.requestId,
        active.taskId,
      );
    }
  });

  scheduleNext();
}

export function adoptWorkerTab(
  tabId: number | undefined,
): void {
  if (tabId === undefined) {
    return;
  }

  const worker = workers.find(
    (candidate) =>
      candidate.target !== undefined &&
      isWorkerTabTarget(candidate.target) &&
      candidate.target.tabId === tabId,
  );

  if (worker?.target) {
    removeWorker(worker);
    resetWorkerReadiness(tabId);
    activeTaskByWorkerKey.delete(`tab:${tabId}`);

    extensionLog.debug("Worker pool: tab adopted by user", {
      tabId,
    });

    scheduleNext();
  }
}

export async function disposeWorkerPool(): Promise<void> {
  const workersToDispose = [...workers];
  const queuedTasks = [...queue];

  workers = [];
  queue = [];

  await disposeWorkerPoolLifecycle({
    workers: workersToDispose,
    queue: queuedTasks,
    activeTaskByWorkerKey,
    cancelledRequestIds,
    generation: getWorkerPoolGeneration(),
  });
}