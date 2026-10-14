// @source-path [fobles] src/content/sitecore-harvester/worker-pool/background-worker-pool.ts

import { REFERENCE_GRAPH } from "../../../constants/graph.const";
import { extensionLog } from "../../logger";
import {
  closeWorkerTab,
  createWorkerTab,
  navigateWorkerTab,
  sendCancelToWorkerTab,
  sendTaskToWorkerTab,
} from "../background-tab/worker-tab-service";
import {
  createCancelledResult,
  createErrorResult,
  type WorkerTask,
  type WorkerTaskResult,
} from "./worker-task.types";

const MAX_WORKERS = REFERENCE_GRAPH.WORKER_POOL.MAX_WORKERS;
const READY_TIMEOUT_MS = 20000;

type PoolWorker = {
  tabId: number;
  status: "idle" | "busy";
  currentUrl: string | undefined;
};

type QueuedTask = {
  task: WorkerTask;
  retried: boolean;
  resolve: (result: WorkerTaskResult) => void;
};

let workers: PoolWorker[] = [];
let queue: QueuedTask[] = [];
const cancelledRequestIds = new Set<string>();
const activeTaskByTabId = new Map<number, { requestId: string; taskId: string }>();
const readyResolversByTabId = new Map<number, Array<() => void>>();

function removeWorker(worker: PoolWorker): void {
  workers = workers.filter((candidate) => candidate !== worker);
}

function waitForWorkerReady(tabId: number, timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      const resolvers = readyResolversByTabId.get(tabId);
      if (resolvers) {
        readyResolversByTabId.set(
          tabId,
          resolvers.filter((resolver) => resolver !== onReady),
        );
      }
      reject(new Error(`Worker tab ${tabId} did not become ready in time`));
    }, timeoutMs);

    function onReady(): void {
      clearTimeout(timeout);
      resolve();
    }

    const resolvers = readyResolversByTabId.get(tabId) ?? [];
    resolvers.push(onReady);
    readyResolversByTabId.set(tabId, resolvers);
  });
}

export function handleWorkerReady(tabId: number | undefined): void {
  if (tabId === undefined) {
    return;
  }

  const resolvers = readyResolversByTabId.get(tabId);
  if (!resolvers) {
    return;
  }

  readyResolversByTabId.delete(tabId);
  resolvers.forEach((resolve) => {
    resolve();
  });
}

export function handleWorkerTabRemoved(tabId: number): void {
  const worker = workers.find((candidate) => candidate.tabId === tabId);
  if (worker) {
    removeWorker(worker);
  }
  activeTaskByTabId.delete(tabId);
  readyResolversByTabId.delete(tabId);
}

async function runTaskOnWorkerTab(worker: PoolWorker, queued: QueuedTask): Promise<void> {
  activeTaskByTabId.set(worker.tabId, {
    requestId: queued.task.requestId,
    taskId: queued.task.taskId,
  });

  let result: WorkerTaskResult | undefined;
  try {
    result = await sendTaskToWorkerTab(worker.tabId, queued.task);
  } catch (error) {
    extensionLog.warn("Worker pool: task execution failed", { task: queued.task, error });
    result = undefined;
  }

  activeTaskByTabId.delete(worker.tabId);

  if (cancelledRequestIds.has(queued.task.requestId)) {
    worker.status = "idle";
    queued.resolve(createCancelledResult(queued.task));
    scheduleNext();
    return;
  }

  if (!result && !queued.retried) {
    queued.retried = true;
    await closeWorkerTab(worker.tabId);
    removeWorker(worker);
    void runOnNewWorker(createPendingWorker(), queued);
    scheduleNext();
    return;
  }

  worker.status = "idle";
  queued.resolve(result ?? createErrorResult(queued.task, "Worker task failed with no result"));
  scheduleNext();
}

function createPendingWorker(): PoolWorker {
  const pendingWorker: PoolWorker = { tabId: -1, status: "busy", currentUrl: undefined };
  workers.push(pendingWorker);
  return pendingWorker;
}

async function runOnNewWorker(pendingWorker: PoolWorker, queued: QueuedTask): Promise<void> {
  const tabId = await createWorkerTab(queued.task.url, REFERENCE_GRAPH.DEBUG_BACKGROUND_HARVEST);

  if (tabId === undefined) {
    removeWorker(pendingWorker);
    queued.resolve(createErrorResult(queued.task, "Failed to create worker tab"));
    scheduleNext();
    return;
  }

  pendingWorker.tabId = tabId;
  pendingWorker.currentUrl = queued.task.url;

  try {
    await waitForWorkerReady(tabId, READY_TIMEOUT_MS);
  } catch (error) {
    extensionLog.warn("Worker pool: worker tab failed to become ready", { tabId, error });
    await closeWorkerTab(tabId);
    removeWorker(pendingWorker);
    queued.resolve(createErrorResult(queued.task, "Worker tab failed to become ready"));
    scheduleNext();
    return;
  }

  await runTaskOnWorkerTab(pendingWorker, queued);
}

async function runOnWorker(worker: PoolWorker, queued: QueuedTask): Promise<void> {
  if (worker.currentUrl !== queued.task.url) {
    try {
      await navigateWorkerTab(worker.tabId, queued.task.url);
      await waitForWorkerReady(worker.tabId, READY_TIMEOUT_MS);
      worker.currentUrl = queued.task.url;
    } catch (error) {
      extensionLog.warn("Worker pool: failed to navigate worker tab", { tabId: worker.tabId, error });
      await closeWorkerTab(worker.tabId);
      removeWorker(worker);

      if (!queued.retried) {
        queued.retried = true;
        void runOnNewWorker(createPendingWorker(), queued);
      } else {
        queued.resolve(createErrorResult(queued.task, "Worker tab failed to navigate"));
      }

      scheduleNext();
      return;
    }
  }

  await runTaskOnWorkerTab(worker, queued);
}

function scheduleNext(): void {
  while (queue.length > 0) {
    const next = queue[0];

    if (cancelledRequestIds.has(next.task.requestId)) {
      queue.shift();
      next.resolve(createCancelledResult(next.task));
      continue;
    }

    const idleWorker = workers.find((worker) => worker.status === "idle");
    if (idleWorker) {
      queue.shift();
      idleWorker.status = "busy";
      void runOnWorker(idleWorker, next);
      continue;
    }

    if (workers.length >= MAX_WORKERS) {
      break;
    }

    queue.shift();
    void runOnNewWorker(createPendingWorker(), next);
  }
}

// Called by the service worker's message listener for POOL_RUN_TASK. Enqueues the task and
// resolves once some pool worker tab has executed it (or it was cancelled/failed/retried).
export function runPoolTask(task: WorkerTask): Promise<WorkerTaskResult> {
  return new Promise((resolve) => {
    queue.push({ task, retried: false, resolve });
    scheduleNext();
  });
}

// Called by the service worker's message listener for POOL_CANCEL_REQUEST.
export function cancelPoolRequest(requestId: string): void {
  cancelledRequestIds.add(requestId);

  queue = queue.filter((queued) => {
    if (queued.task.requestId !== requestId) {
      return true;
    }
    queued.resolve(createCancelledResult(queued.task));
    return false;
  });

  for (const [tabId, active] of activeTaskByTabId) {
    if (active.requestId === requestId) {
      sendCancelToWorkerTab(tabId, active.requestId, active.taskId);
    }
  }
}

// Closes every tab the pool owns. Intended for chrome.runtime.onSuspend - not called per-request,
// since the pool is meant to be reused across harvest requests for the lifetime of the service
// worker.
export async function disposeWorkerPool(): Promise<void> {
  const tabIds = workers.filter((worker) => worker.tabId !== -1).map((worker) => worker.tabId);
  workers = [];

  queue.forEach((queued) => {
    queued.resolve(createCancelledResult(queued.task));
  });
  queue = [];

  await Promise.all(tabIds.map((tabId) => closeWorkerTab(tabId)));
}
