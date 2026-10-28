// @source-path [fobles] src/content/foundation/workers/pool/background-worker-pool.ts

import { DEFAULT_RUNTIME_SETTINGS, getRuntimeSettings } from "../../../runtime-settings/runtime-settings";
import { publishActivityToHost } from "../../../shared/activity/activity-events";
import { labelForWorkerTask } from "../../../shared/activity/activity-labels";
import { extensionLog } from "../../../logger";
import { closeWorkerTarget, sendCancelToWorkerTarget } from "../transport/worker-target-service";
import { runTaskOnNewWorker, runWorkerTask } from "./worker-executor";
import { disposeWorkerPoolLifecycle } from "./worker-pool-lifecycle";
import { getWorkerPoolMaxWorkers, onWorkerPoolMaxWorkersChange } from "./worker-pool-settings";
import { markWorkerReady, resetWorkerReadiness } from "./worker-readiness";
import { createCancelledResult, type ActiveWorkerTask, type PoolWorker, type QueuedTask, type WorkerExecutorContext, type WorkerTask, type WorkerTaskResult } from "../tasks/worker-task.types";
import { isWorkerTabTarget, type WorkerTarget } from "./worker-target";

type WorkerPoolState = {
  hostTabId: number | undefined;
  generation: number;
  workers: PoolWorker[];
  queue: QueuedTask[];
  cancelledRequestIds: Set<string>;
  activeTaskByWorkerKey: Map<string, ActiveWorkerTask>;
  lastProgressAt: number;
  recoveryCount: number;
  healthTimer: ReturnType<typeof setInterval> | undefined;
};

let maxWorkers = DEFAULT_RUNTIME_SETTINGS.workerPool.maxWorkers;
const poolsByHostTabId = new Map<number, WorkerPoolState>();
const disposingHostTabIds = new Set<number>();
let fallbackPool: WorkerPoolState | undefined;
const RETIRED_WORKER_GRACE_MS = 10000;

function createPool(hostTabId: number | undefined): WorkerPoolState {
  const pool: WorkerPoolState = { hostTabId, generation: 0, workers: [], queue: [], cancelledRequestIds: new Set<string>(), activeTaskByWorkerKey: new Map<string, ActiveWorkerTask>(), lastProgressAt: performance.now(), recoveryCount: 0, healthTimer: undefined };
  startPoolHealthSupervisor(pool);
  return pool;
}

function markPoolProgress(pool: WorkerPoolState, reason: string): void { 
pool.lastProgressAt = performance.now(); 
extensionLog.debug("Worker pool health: progress", { hostTabId: pool.hostTabId, reason, queueLength: pool.queue.length, workerCount: pool.workers.length, activeTaskCount: pool.activeTaskByWorkerKey.size }); }
function startPoolHealthSupervisor(pool: WorkerPoolState): void {
  const settings = getRuntimeSettings().workerPool;
  pool.healthTimer = setInterval(() => {
    const checkedAt = performance.now();
    const workers = pool.workers.map((worker, index) => ({ index, state: worker.state, activeTaskId: worker.activeTaskId, noProgressMs: Math.round(checkedAt - worker.lastProgressAt), recoveryCount: worker.recoveryCount, healthy: worker.state === "idle" || worker.state === "retired" || (worker.state === "busy" && worker.activeTaskId !== undefined && checkedAt - worker.lastProgressAt < settings.workerNoProgressMs) || (worker.state === "starting" && worker.activeTaskId !== undefined && checkedAt - worker.lastProgressAt < settings.workerNoProgressMs) }));
    const unhealthyWorkers = workers.filter((worker) => !worker.healthy);
    const poolNoProgressMs = Math.round(checkedAt - pool.lastProgressAt);
    const poolUnhealthy = (pool.queue.length > 0 || pool.activeTaskByWorkerKey.size > 0) && poolNoProgressMs >= settings.poolNoProgressMs;
    extensionLog.debug("Worker pool health: poll", { hostTabId: pool.hostTabId, healthy: !poolUnhealthy && unhealthyWorkers.length === 0, poolNoProgressMs, queueLength: pool.queue.length, activeTaskCount: pool.activeTaskByWorkerKey.size, recoveryCount: pool.recoveryCount, maxRecoveries: settings.poolMaxWorkerRecoveries, workers, unhealthyWorkers });
    if (unhealthyWorkers.length === 0 && !poolUnhealthy) 
return;
    if (pool.recoveryCount >= settings.poolMaxWorkerRecoveries) { 
extensionLog.error("Worker pool health: recovery limit exhausted", { hostTabId: pool.hostTabId, poolNoProgressMs, recoveryCount: pool.recoveryCount, unhealthyWorkers }); 
cancelPoolRequest(Array.from(pool.activeTaskByWorkerKey.values())[0]?.requestId ?? "", pool.hostTabId); 
return; }
    const unhealthy = pool.workers.find((worker) => worker.state !== "retired" && worker.state !== "idle" && (worker.activeTaskId === undefined || checkedAt - worker.lastProgressAt >= settings.workerNoProgressMs));
    if (unhealthy) { 
pool.recoveryCount += 1; 
unhealthy.recoveryCount += 1; 
extensionLog.warn("Worker pool health: retiring unhealthy worker", { hostTabId: pool.hostTabId, activeTaskId: unhealthy.activeTaskId, recoveryCount: pool.recoveryCount }); 
retireWorker(pool, unhealthy); 
void destroyRetiredWorker(pool, unhealthy, "health-check-no-progress"); 
markPoolProgress(pool, "unhealthy-worker-retired"); 
scheduleNext(pool); }
  }, settings.healthPollIntervalMs);
}
function getPool(hostTabId: number | undefined, create = true): WorkerPoolState | undefined {
  if (hostTabId === undefined) {
    if (!fallbackPool && create) 
fallbackPool = createPool(undefined);
    return fallbackPool;
  }
  let pool = poolsByHostTabId.get(hostTabId);
  if (!pool && create) {
    pool = createPool(hostTabId);
    poolsByHostTabId.set(hostTabId, pool);
    extensionLog.debug("Worker pool: host pool created", { hostTabId });
  }
  return pool;
}

function deletePool(pool: WorkerPoolState): void {
  if (pool.hostTabId === undefined) 
fallbackPool = undefined;
  else if (poolsByHostTabId.get(pool.hostTabId) === pool) 
poolsByHostTabId.delete(pool.hostTabId);
}

function forEachPool(callback: (pool: WorkerPoolState) => void): void {
  poolsByHostTabId.forEach(callback);
  if (fallbackPool) 
callback(fallbackPool);
}

void initializeWorkerPoolSettings();
onWorkerPoolMaxWorkersChange((newMaxWorkers) => {
  maxWorkers = newMaxWorkers;
  extensionLog.debug("Worker pool: maximum worker count changed", {
    maxWorkers,
    poolCount: poolsByHostTabId.size + (fallbackPool ? 1 : 0),
    workerCount: Array.from(poolsByHostTabId.values()).reduce((total, pool) => total + pool.workers.length, 0) + (fallbackPool?.workers.length ?? 0),
    queueLength: Array.from(poolsByHostTabId.values()).reduce((total, pool) => total + pool.queue.length, 0) + (fallbackPool?.queue.length ?? 0),
  });
  forEachPool(scheduleNext);
});

async function initializeWorkerPoolSettings(): Promise<void> {
  maxWorkers = await getWorkerPoolMaxWorkers();
  extensionLog.debug("Worker pool: settings initialized", { maxWorkers });
  forEachPool(scheduleNext);
}

function getWorkerTargetKey(target: WorkerTarget): string {
  return target.kind === "tab" ? `tab:${target.tabId}` : `iframe:${target.workerId}`;
}

function createPendingWorker(pool: WorkerPoolState): PoolWorker {
  const worker: PoolWorker = { target: undefined, state: "starting", currentUrl: undefined, generation: pool.generation, retirementTimer: undefined, lastProgressAt: performance.now(), recoveryCount: 0, activeTaskId: undefined };
  pool.workers.push(worker);
  return worker;
}

function retireWorker(pool: WorkerPoolState, worker: PoolWorker): void {
  if (worker.state === "retired") 
return;
  const target = worker.target;
  worker.state = "retired";
  worker.retirementTimer = setTimeout(() => void destroyRetiredWorker(pool, worker, "retirement-grace-expired"), RETIRED_WORKER_GRACE_MS);
  extensionLog.debug("Worker pool: worker retired", { hostTabId: pool.hostTabId, target, graceMs: RETIRED_WORKER_GRACE_MS, retiredWorkerCount: pool.workers.filter((x) => x.state === "retired").length });
}

async function destroyRetiredWorker(pool: WorkerPoolState, worker: PoolWorker, reason: string): Promise<void> {
  if (worker.state !== "retired") 
return;
  if (worker.retirementTimer) {
    clearTimeout(worker.retirementTimer);
    worker.retirementTimer = undefined;
  }
  const target = worker.target;
  pool.workers = pool.workers.filter((x) => x !== worker);
  if (target) {
    pool.activeTaskByWorkerKey.delete(getWorkerTargetKey(target));
    if (isWorkerTabTarget(target)) 
resetWorkerReadiness(target.tabId);
    await closeWorkerTarget(target);
    worker.target = undefined;
  }
  extensionLog.debug("Worker pool: retired worker destroyed", { hostTabId: pool.hostTabId, target, reason, workerCount: pool.workers.length, retiredWorkerCount: pool.workers.filter((x) => x.state === "retired").length });
  scheduleNext(pool);
}

function retireAllWorkers(pool: WorkerPoolState): number {
  const workers = pool.workers.filter((worker) => worker.generation === pool.generation && worker.state !== "retired");
  workers.forEach((worker) => retireWorker(pool, worker));
  return workers.length;
}

function createExecutorContext(pool: WorkerPoolState): WorkerExecutorContext {
  const generation = pool.generation;
  return {
    activeTaskByWorkerKey: pool.activeTaskByWorkerKey,
    cancelledRequestIds: pool.cancelledRequestIds,
    createPendingWorker: () => createPendingWorker(pool),
    retireWorker: (worker) => retireWorker(pool, worker),
    destroyRetiredWorker: (worker, reason) => destroyRetiredWorker(pool, worker, reason),
    retireAllWorkers: () => retireAllWorkers(pool),
    scheduleNext: () => scheduleNext(pool),
    isCurrentGeneration: () => pool.generation === generation,
  };
}

export function handleWorkerReady(tabId: number | undefined): void { 
markWorkerReady(tabId); }

export function handleWorkerTabRemoved(tabId: number): void {
  forEachPool((pool) => {
    const worker = pool.workers.find((candidate) => candidate.target !== undefined && isWorkerTabTarget(candidate.target) && candidate.target.tabId === tabId);
    if (worker?.target) {
      pool.workers = pool.workers.filter((candidate) => candidate !== worker);
      pool.activeTaskByWorkerKey.delete(`tab:${tabId}`);
      scheduleNext(pool);
    }
  });
  resetWorkerReadiness(tabId);
}

function scheduleNext(pool: WorkerPoolState): void {
  let scheduling = true;
  while (scheduling && pool.queue.length > 0) {
    const next = pool.queue[0];
    if (pool.cancelledRequestIds.has(next.task.requestId)) {
      pool.queue.shift();
      markPoolProgress(pool, "task-assigned");
      next.resolve(createCancelledResult(next.task));
      continue;
    }
    const idle = pool.workers.find((worker) => worker.generation === pool.generation && worker.state === "idle");
    const count = pool.workers.filter((worker) => worker.generation === pool.generation && worker.state !== "retired").length;
    if (idle) {
      pool.queue.shift();
      markPoolProgress(pool, "task-assigned");
      idle.state = "busy";
      idle.activeTaskId = next.task.taskId;
      idle.lastProgressAt = performance.now();
      void runWorkerTask(createExecutorContext(pool), idle, next);
    } else if (count < maxWorkers) {
      pool.queue.shift();
      markPoolProgress(pool, "task-assigned");
      const worker = createPendingWorker(pool);
      worker.activeTaskId = next.task.taskId;
      worker.lastProgressAt = performance.now();
      void runTaskOnNewWorker(createExecutorContext(pool), worker, next);
    } else {
      scheduling = false;
    }
  }
}

export async function runPoolTask(task: WorkerTask, hostTabId: number | undefined): Promise<WorkerTaskResult> {
  maxWorkers = await getWorkerPoolMaxWorkers();
  if (hostTabId !== undefined && disposingHostTabIds.has(hostTabId)) 
return createCancelledResult(task);
  const pool = getPool(hostTabId)!;
  return await new Promise((resolve) => {
    if (pool.cancelledRequestIds.has(task.requestId)) {
      publishActivityToHost(hostTabId, { source: "worker", requestId: task.requestId, activityId: task.taskId, kind: task.type, label: labelForWorkerTask(task), state: "cancelled" });
      resolve(createCancelledResult(task));
      return;
    }
    publishActivityToHost(hostTabId, { source: "worker", requestId: task.requestId, activityId: task.taskId, kind: task.type, label: labelForWorkerTask(task), state: "queued" });
    const submittedAt = performance.now();
    pool.queue.push({ task, hostTabId, retried: false, editorStateChangeCount: 0, submittedAt, deadlineAt: submittedAt + getRuntimeSettings().workerPool.taskTimeoutMs, recoveryCount: 0, resolve });
    markPoolProgress(pool, "task-queued");
    extensionLog.debug(`Worker pool: task queued - maxWorkers=${maxWorkers}, workers=${pool.workers.length}, queue=${pool.queue.length}`, { hostTabId, requestId: task.requestId, taskId: task.taskId, taskType: task.type, maxWorkers, workerCount: pool.workers.length, schedulableWorkerCount: pool.workers.filter((worker) => worker.state !== "retired").length, retiredWorkerCount: pool.workers.filter((worker) => worker.state === "retired").length, queueLength: pool.queue.length, poolGeneration: pool.generation });
    scheduleNext(pool);
  });
}

export function cancelPoolRequest(requestId: string, hostTabId: number | undefined): void {
  const pool = getPool(hostTabId, false);
  if (!pool) 
return;
  pool.cancelledRequestIds.add(requestId);
  pool.queue = pool.queue.filter((queued) => {
    const matches = queued.task.requestId === requestId;
    if (matches) 
queued.resolve(createCancelledResult(queued.task));
    return !matches;
  });
  const active = Array.from(pool.activeTaskByWorkerKey.values()).filter((task) => task.requestId === requestId);
  active.forEach((task) => {
    sendCancelToWorkerTarget(task.target, task.requestId, task.taskId);
    const worker = pool.workers.find((candidate) => candidate.target !== undefined && getWorkerTargetKey(candidate.target) === getWorkerTargetKey(task.target));
    if (worker) 
retireWorker(pool, worker);
  });
  extensionLog.debug("Worker pool: request cancelled; matching workers retired", { hostTabId, requestId, activeTaskCount: active.length, totalRetiredWorkerCount: pool.workers.filter((worker) => worker.state === "retired").length });
  scheduleNext(pool);
}

export function cancelPoolTask(requestId: string, taskId: string, hostTabId: number | undefined): void {
  const pool = getPool(hostTabId, false);
  if (!pool) 
return;
  pool.queue = pool.queue.filter((queued) => {
    const matches = queued.task.requestId === requestId && queued.task.taskId === taskId;
    if (matches) 
queued.resolve(createCancelledResult(queued.task));
    return !matches;
  });
  const active = Array.from(pool.activeTaskByWorkerKey.values()).filter((task) => task.requestId === requestId && task.taskId === taskId);
  active.forEach((task) => {
    sendCancelToWorkerTarget(task.target, task.requestId, task.taskId);
    const worker = pool.workers.find((candidate) => candidate.target !== undefined && getWorkerTargetKey(candidate.target) === getWorkerTargetKey(task.target));
    if (worker) 
retireWorker(pool, worker);
  });
  extensionLog.debug("Worker pool: task cancelled; matching workers retired", { hostTabId, requestId, taskId, activeTaskCount: active.length, totalRetiredWorkerCount: pool.workers.filter((worker) => worker.state === "retired").length });
  scheduleNext(pool);
}

export function adoptWorkerTab(tabId: number | undefined): void {
  if (tabId === undefined) 
return;
  forEachPool((pool) => {
    const worker = pool.workers.find((candidate) => candidate.target !== undefined && isWorkerTabTarget(candidate.target) && candidate.target.tabId === tabId);
    if (worker?.target) {
      pool.workers = pool.workers.filter((candidate) => candidate !== worker);
      resetWorkerReadiness(tabId);
      pool.activeTaskByWorkerKey.delete(`tab:${tabId}`);
      extensionLog.debug("Worker pool: tab adopted by user", { hostTabId: pool.hostTabId, tabId });
      scheduleNext(pool);
    }
  });
}

export async function disposeWorkerPool(hostTabId?: number): Promise<void> {
  if (hostTabId === undefined) {
    const pools = [...poolsByHostTabId.values(), ...(fallbackPool ? [fallbackPool] : [])];
    await Promise.all(pools.map(disposeOnePool));
    return;
  }
  const pool = getPool(hostTabId, false);
  if (pool) 
await disposeOnePool(pool);
}

async function disposeOnePool(pool: WorkerPoolState): Promise<void> {
  if (pool.healthTimer !== undefined) { 
clearInterval(pool.healthTimer); 
pool.healthTimer = undefined; }
  if (pool.hostTabId !== undefined) 
disposingHostTabIds.add(pool.hostTabId);
  const workers = [...pool.workers];
  const queue = [...pool.queue];
  pool.workers = [];
  pool.queue = [];
  workers.forEach((worker) => {
    if (worker.retirementTimer) {
      clearTimeout(worker.retirementTimer);
      worker.retirementTimer = undefined;
    }
  });
  const generation = pool.generation;
  pool.generation += 1;
  deletePool(pool);
  try {
    await disposeWorkerPoolLifecycle({ workers, queue, activeTaskByWorkerKey: pool.activeTaskByWorkerKey, cancelledRequestIds: pool.cancelledRequestIds, generation });
    extensionLog.debug("Worker pool: host pool disposed", { hostTabId: pool.hostTabId, generation: pool.generation });
  } finally {
    if (pool.hostTabId !== undefined) 
disposingHostTabIds.delete(pool.hostTabId);
  }
}

export function clearWorkerPoolForHost(hostTabId: number): void {
  const pool = getPool(hostTabId, false);
  if (pool) 
void disposeOnePool(pool);
}
