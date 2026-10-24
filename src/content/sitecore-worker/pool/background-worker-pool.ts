// @source-path [fobles] src/content/sitecore-worker/pool/background-worker-pool.ts

import { DEFAULT_RUNTIME_SETTINGS } from "../../runtime-settings/runtime-settings";
import { publishActivityToHost } from "../../shared/activity/activity-events";
import { extensionLog } from "../../logger";
import { closeWorkerTarget } from "../transport/worker-target-service";
import {
  runTaskOnNewWorker,
  runWorkerTask,
} from "./worker-executor";
import { disposeWorkerPoolLifecycle } from "./worker-pool-lifecycle";
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
} from "../tasks/worker-task.types";
import {
  isWorkerTabTarget,
  type WorkerTarget,
} from "./worker-target";

type WorkerPoolState = { hostTabId: number | undefined; generation: number; workers: PoolWorker[]; queue: QueuedTask[]; cancelledRequestIds: Set<string>; activeTaskByWorkerKey: Map<string, ActiveWorkerTask> };
let maxWorkers = DEFAULT_RUNTIME_SETTINGS.workerPool.maxWorkers;
const poolsByHostTabId = new Map<number, WorkerPoolState>();
let fallbackPool: WorkerPoolState | undefined;
const RETIRED_WORKER_GRACE_MS = 10000;
function createPool(hostTabId: number | undefined): WorkerPoolState { return { hostTabId, generation: 0, workers: [], queue: [], cancelledRequestIds: new Set(), activeTaskByWorkerKey: new Map() }; }
function getPool(hostTabId: number | undefined, create = true): WorkerPoolState | undefined { if (hostTabId === undefined) { if (!fallbackPool && create) fallbackPool = createPool(undefined); return fallbackPool; } let pool = poolsByHostTabId.get(hostTabId); if (!pool && create) { pool = createPool(hostTabId); poolsByHostTabId.set(hostTabId, pool); extensionLog.debug("Worker pool: host pool created", { hostTabId }); } return pool; }
function deletePool(pool: WorkerPoolState): void { if (pool.hostTabId === undefined) fallbackPool = undefined; else if (poolsByHostTabId.get(pool.hostTabId) === pool) poolsByHostTabId.delete(pool.hostTabId); }
function forEachPool(callback: (pool: WorkerPoolState) => void): void { poolsByHostTabId.forEach(callback); if (fallbackPool) callback(fallbackPool); }
void initializeWorkerPoolSettings();

onWorkerPoolMaxWorkersChange((newMaxWorkers) => {
  maxWorkers = newMaxWorkers;

  extensionLog.debug("Worker pool: maximum worker count changed", {
    maxWorkers,
    poolCount: poolsByHostTabId.size + (fallbackPool ? 1 : 0),
    workerCount:
      Array.from(poolsByHostTabId.values()).reduce(
        (total, pool) => total + pool.workers.length,
        0,
      ) + (fallbackPool?.workers.length ?? 0),
    queueLength:
      Array.from(poolsByHostTabId.values()).reduce(
        (total, pool) => total + pool.queue.length,
        0,
      ) + (fallbackPool?.queue.length ?? 0),
  });

  forEachPool(scheduleNext);
});

async function initializeWorkerPoolSettings(): Promise<void> {
  maxWorkers = await getWorkerPoolMaxWorkers();

  extensionLog.debug("Worker pool: settings initialized", {
    maxWorkers,
  });

  forEachPool(scheduleNext);
}

function getWorkerTargetKey(target: WorkerTarget): string {
  return target.kind === "tab"
    ? `tab:${target.tabId}`
    : `iframe:${target.workerId}`;
}

function createPendingWorker(pool: WorkerPoolState): PoolWorker { const worker: PoolWorker = { target: undefined, state: "starting", currentUrl: undefined, generation: pool.generation, retirementTimer: undefined }; pool.workers.push(worker); return worker; }
function retireWorker(pool: WorkerPoolState, worker: PoolWorker): void { if (worker.state === "retired") return; const target = worker.target; worker.state = "retired"; worker.retirementTimer = setTimeout(() => void destroyRetiredWorker(pool, worker, "retirement-grace-expired"), RETIRED_WORKER_GRACE_MS); extensionLog.debug("Worker pool: worker retired", { hostTabId: pool.hostTabId, target, graceMs: RETIRED_WORKER_GRACE_MS, retiredWorkerCount: pool.workers.filter(x => x.state === "retired").length }); }
async function destroyRetiredWorker(pool: WorkerPoolState, worker: PoolWorker, reason: string): Promise<void> { if (worker.state !== "retired") return; if (worker.retirementTimer) { clearTimeout(worker.retirementTimer); worker.retirementTimer = undefined; } const target = worker.target; pool.workers = pool.workers.filter(x => x !== worker); if (target) { pool.activeTaskByWorkerKey.delete(getWorkerTargetKey(target)); if (isWorkerTabTarget(target)) resetWorkerReadiness(target.tabId); await closeWorkerTarget(target); worker.target = undefined; } extensionLog.debug("Worker pool: retired worker destroyed", { hostTabId: pool.hostTabId, target, reason, workerCount: pool.workers.length, retiredWorkerCount: pool.workers.filter(x => x.state === "retired").length }); scheduleNext(pool); }
function retireAllWorkers(pool: WorkerPoolState): number { const xs = pool.workers.filter(w => w.generation === pool.generation && w.state !== "retired"); xs.forEach(w => retireWorker(pool, w)); return xs.length; }
function createExecutorContext(pool: WorkerPoolState): WorkerExecutorContext { const generation = pool.generation; return { activeTaskByWorkerKey: pool.activeTaskByWorkerKey, cancelledRequestIds: pool.cancelledRequestIds, createPendingWorker: () => createPendingWorker(pool), retireWorker: w => retireWorker(pool, w), destroyRetiredWorker: (w, r) => destroyRetiredWorker(pool, w, r), retireAllWorkers: () => retireAllWorkers(pool), scheduleNext: () => scheduleNext(pool), isCurrentGeneration: () => pool.generation === generation }; }
export function handleWorkerReady(tabId: number | undefined): void { markWorkerReady(tabId); }
export function handleWorkerTabRemoved(tabId: number): void { forEachPool(pool => { const w = pool.workers.find(x => x.target !== undefined && isWorkerTabTarget(x.target) && x.target.tabId === tabId); if (w?.target) { pool.workers = pool.workers.filter(x => x !== w); pool.activeTaskByWorkerKey.delete(`tab:${tabId}`); scheduleNext(pool); } }); resetWorkerReadiness(tabId); }
function scheduleNext(pool: WorkerPoolState): void { let scheduling = true; while (scheduling && pool.queue.length > 0) { const next = pool.queue[0]; if (pool.cancelledRequestIds.has(next.task.requestId)) { pool.queue.shift(); next.resolve(createCancelledResult(next.task)); continue; } const idle = pool.workers.find(w => w.generation === pool.generation && w.state === "idle"); const count = pool.workers.filter(w => w.generation === pool.generation && w.state !== "retired").length; if (idle) { pool.queue.shift(); idle.state = "busy"; void runWorkerTask(createExecutorContext(pool), idle, next); } else if (count < maxWorkers) { pool.queue.shift(); runTaskOnNewWorker(createExecutorContext(pool), createPendingWorker(pool), next); } else scheduling = false; } }
export async function runPoolTask(task: WorkerTask, hostTabId: number | undefined): Promise<WorkerTaskResult> { maxWorkers = await getWorkerPoolMaxWorkers(); const pool = getPool(hostTabId)!; return await new Promise(resolve => { if (pool.cancelledRequestIds.has(task.requestId)) { publishActivityToHost(hostTabId, { source: "worker", requestId: task.requestId, activityId: task.taskId, kind: task.type, label: task.type, state: "cancelled" }); resolve(createCancelledResult(task)); return; } publishActivityToHost(hostTabId, { source: "worker", requestId: task.requestId, activityId: task.taskId, kind: task.type, label: task.type, state: "queued" }); pool.queue.push({ task, hostTabId, retried: false, editorStateChangeCount: 0, resolve }); extensionLog.debug(`Worker pool: task queued - maxWorkers=${maxWorkers}, workers=${pool.workers.length}, queue=${pool.queue.length}`, { hostTabId, requestId: task.requestId, taskId: task.taskId, taskType: task.type, maxWorkers, workerCount: pool.workers.length, schedulableWorkerCount: pool.workers.filter(w => w.state !== "retired").length, retiredWorkerCount: pool.workers.filter(w => w.state === "retired").length, queueLength: pool.queue.length, poolGeneration: pool.generation }); scheduleNext(pool); }); }
export function cancelPoolRequest(requestId: string, hostTabId: number | undefined): void { const pool = getPool(hostTabId, false); if (!pool) return; pool.cancelledRequestIds.add(requestId); pool.queue = pool.queue.filter(q => { const m = q.task.requestId === requestId; if (m) q.resolve(createCancelledResult(q.task)); return !m; }); const n = retireAllWorkers(pool); extensionLog.debug("Worker pool: request cancelled; generation workers retired", { hostTabId, requestId, retiredWorkerCount: n, totalRetiredWorkerCount: pool.workers.filter(w => w.state === "retired").length }); scheduleNext(pool); }
export function cancelPoolTask(requestId: string, taskId: string, hostTabId: number | undefined): void { const pool = getPool(hostTabId, false); if (!pool) return; pool.queue = pool.queue.filter(q => { const m = q.task.requestId === requestId && q.task.taskId === taskId; if (m) q.resolve(createCancelledResult(q.task)); return !m; }); const active = Array.from(pool.activeTaskByWorkerKey.values()).filter(a => a.requestId === requestId && a.taskId === taskId); active.forEach(a => { const w = pool.workers.find(x => x.target !== undefined && getWorkerTargetKey(x.target) === getWorkerTargetKey(a.target)); if (w) retireWorker(pool, w); }); extensionLog.debug("Worker pool: task cancelled; workers retired", { hostTabId, requestId, taskId, retiredWorkerCount: active.length, totalRetiredWorkerCount: pool.workers.filter(w => w.state === "retired").length }); scheduleNext(pool); }
export function adoptWorkerTab(tabId: number | undefined): void { if (tabId === undefined) return; forEachPool(pool => { const w = pool.workers.find(x => x.target !== undefined && isWorkerTabTarget(x.target) && x.target.tabId === tabId); if (w?.target) { pool.workers = pool.workers.filter(x => x !== w); resetWorkerReadiness(tabId); pool.activeTaskByWorkerKey.delete(`tab:${tabId}`); extensionLog.debug("Worker pool: tab adopted by user", { hostTabId: pool.hostTabId, tabId }); scheduleNext(pool); } }); }
export async function disposeWorkerPool(hostTabId?: number): Promise<void> { if (hostTabId === undefined) { const pools = [...poolsByHostTabId.values(), ...(fallbackPool ? [fallbackPool] : [])]; await Promise.all(pools.map(disposeOnePool)); return; } const pool = getPool(hostTabId, false); if (pool) await disposeOnePool(pool); }
async function disposeOnePool(pool: WorkerPoolState): Promise<void> { const workers = [...pool.workers], queue = [...pool.queue]; pool.workers = []; pool.queue = []; workers.forEach(w => { if (w.retirementTimer) { clearTimeout(w.retirementTimer); w.retirementTimer = undefined; } }); const generation = pool.generation; pool.generation += 1; deletePool(pool); await disposeWorkerPoolLifecycle({ workers, queue, activeTaskByWorkerKey: pool.activeTaskByWorkerKey, cancelledRequestIds: pool.cancelledRequestIds, generation }); extensionLog.debug("Worker pool: host pool disposed", { hostTabId: pool.hostTabId, generation: pool.generation }); }
export function clearWorkerPoolForHost(hostTabId: number): void { const pool = getPool(hostTabId, false); if (pool) void disposeOnePool(pool); }
