// @source-path [fobles] src/content/sitecore-harvester/worker-pool/background-worker-pool.ts

import { DEFAULT_RUNTIME_SETTINGS } from "../../runtime-settings/runtime-settings";
import { extensionLog } from "../../logger";
import { closeWorkerTarget } from "../background-tab/worker-target-service";
import {
  runTaskOnNewWorker,
  runWorkerTask,
} from "./worker-executor";
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
  type ActiveWorkerTask,
  type PoolWorker,
  type QueuedTask,
  type WorkerExecutorContext,
  type WorkerTask,
  type WorkerTaskResult,
} from "./worker-task.types";
import {
  isWorkerTabTarget,
  type WorkerTarget,
} from "./worker-target";

let maxWorkers = DEFAULT_RUNTIME_SETTINGS.workerPool.maxWorkers;
let workers: PoolWorker[] = [];
let queue: QueuedTask[] = [];

const cancelledRequestIds = new Set<string>();
const activeTaskByWorkerKey = new Map<string, ActiveWorkerTask>();
const hostTabIds = new Set<number>();
const RETIRED_WORKER_GRACE_MS = 10000;

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

function getWorkerTargetKey(target: WorkerTarget): string {
  return target.kind === "tab"
    ? `tab:${target.tabId}`
    : `iframe:${target.workerId}`;
}

function createPendingWorker(): PoolWorker {
  const worker: PoolWorker = {
    target: undefined,
    state: "starting",
    currentUrl: undefined,
    generation: getWorkerPoolGeneration(),
    retirementTimer: undefined,
  };

  workers.push(worker);
  return worker;
}

function retireWorker(worker: PoolWorker): void {
  if (worker.state === "retired") return;
  const target = worker.target;
  worker.state = "retired";
  worker.retirementTimer = setTimeout(() => {
    void destroyRetiredWorker(worker, "retirement-grace-expired");
  }, RETIRED_WORKER_GRACE_MS);
  extensionLog.debug("Worker pool: worker retired", {
    target,
    graceMs: RETIRED_WORKER_GRACE_MS,
    retiredWorkerCount: workers.filter((candidate) => candidate.state === "retired").length,
  });
}

async function destroyRetiredWorker(worker: PoolWorker, reason: string): Promise<void> {
  if (worker.state !== "retired") return;
  if (worker.retirementTimer) {
    clearTimeout(worker.retirementTimer);
    worker.retirementTimer = undefined;
  }
  const target = worker.target;
  workers = workers.filter((candidate) => candidate !== worker);
  if (target) {
    activeTaskByWorkerKey.delete(getWorkerTargetKey(target));
    if (isWorkerTabTarget(target)) resetWorkerReadiness(target.tabId);
    await closeWorkerTarget(target);
    worker.target = undefined;
  }
  extensionLog.debug("Worker pool: retired worker destroyed", {
    target, reason, workerCount: workers.length,
    retiredWorkerCount: workers.filter((candidate) => candidate.state === "retired").length,
  });
  scheduleNext();
}

function retireAllWorkers(): number {
  const generation = getWorkerPoolGeneration();

  const workersToRetire = workers.filter(
    (worker) =>
      worker.generation === generation &&
      worker.state !== "retired",
  );

  workersToRetire.forEach(retireWorker);

  return workersToRetire.length;
}

function createExecutorContext(): WorkerExecutorContext {
  const generation = getWorkerPoolGeneration();

  return {
    activeTaskByWorkerKey,
    cancelledRequestIds,
    createPendingWorker,
    retireWorker,
    destroyRetiredWorker,
    retireAllWorkers,
    scheduleNext,
    isCurrentGeneration: () =>
      isWorkerPoolGenerationCurrent(generation),
  };
}

export function handleWorkerReady(tabId: number | undefined): void {
  markWorkerReady(tabId);
}

export function handleWorkerTabRemoved(tabId: number): void {
  const worker = workers.find(
    (candidate) =>
      candidate.target !== undefined &&
      isWorkerTabTarget(candidate.target) &&
      candidate.target.tabId === tabId,
  );

  if (worker?.target) {
    workers = workers.filter((candidate) => candidate !== worker);
    activeTaskByWorkerKey.delete(`tab:${tabId}`);
  }

  resetWorkerReadiness(tabId);
  scheduleNext();
}

function scheduleNext(): void {
  let scheduling = true;

  while (scheduling && queue.length > 0) {
    const next = queue[0];
    const generation = getWorkerPoolGeneration();

    if (cancelledRequestIds.has(next.task.requestId)) {
      queue.shift();
      next.resolve(createCancelledResult(next.task));
      continue;
    }

    const idleWorker = workers.find(
      (worker) =>
        worker.generation === generation &&
        worker.state === "idle",
    );

    const schedulableWorkerCount = workers.filter(
      (worker) =>
        worker.generation === generation &&
        worker.state !== "retired",
    ).length;

    if (idleWorker) {
      queue.shift();
      idleWorker.state = "busy";

      void runWorkerTask(
        createExecutorContext(),
        idleWorker,
        next,
      );
    } else if (schedulableWorkerCount < maxWorkers) {
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
        schedulableWorkerCount: workers.filter(
          (worker) => worker.state !== "retired",
        ).length,
        retiredWorkerCount: workers.filter(
          (worker) => worker.state === "retired",
        ).length,
        queueLength: queue.length,
        poolGeneration: getWorkerPoolGeneration(),
      },
    );

    scheduleNext();
  });
}

export function cancelPoolRequest(requestId: string): void {
  cancelledRequestIds.add(requestId);

  queue = queue.filter((queued) => {
    const matches = queued.task.requestId === requestId;

    if (matches) {
      queued.resolve(createCancelledResult(queued.task));
    }

    return !matches;
  });

  const retiredWorkerCount = retireAllWorkers();

  extensionLog.debug(
    "Worker pool: request cancelled; generation workers retired",
    {
      requestId,
      retiredWorkerCount,
      totalRetiredWorkerCount: workers.filter(
        (worker) => worker.state === "retired",
      ).length,
    },
  );

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

  const matchingActiveTasks = Array.from(
    activeTaskByWorkerKey.values(),
  ).filter(
    (active) =>
      active.requestId === requestId &&
      active.taskId === taskId,
  );

  matchingActiveTasks.forEach((active) => {
    const worker = workers.find(
      (candidate) =>
        candidate.target !== undefined &&
        getWorkerTargetKey(candidate.target) ===
          getWorkerTargetKey(active.target),
    );

    if (worker) {
      retireWorker(worker);
    }
  });

  extensionLog.debug("Worker pool: task cancelled; workers retired", {
    requestId,
    taskId,
    retiredWorkerCount: matchingActiveTasks.length,
    totalRetiredWorkerCount: workers.filter(
      (worker) => worker.state === "retired",
    ).length,
  });

  scheduleNext();
}

export function adoptWorkerTab(tabId: number | undefined): void {
  if (tabId === undefined) return;

  const worker = workers.find(
    (candidate) =>
      candidate.target !== undefined &&
      isWorkerTabTarget(candidate.target) &&
      candidate.target.tabId === tabId,
  );

  if (worker?.target) {
    workers = workers.filter((candidate) => candidate !== worker);
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
  workersToDispose.forEach((worker) => {
    if (worker.retirementTimer) {
      clearTimeout(worker.retirementTimer);
      worker.retirementTimer = undefined;
    }
  });

  await disposeWorkerPoolLifecycle({
    workers: workersToDispose,
    queue: queuedTasks,
    activeTaskByWorkerKey,
    cancelledRequestIds,
    generation: getWorkerPoolGeneration(),
  });
}