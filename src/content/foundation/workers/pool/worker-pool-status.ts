// @source-path [fobles] src/content/foundation/workers/pool/worker-pool-status.ts
import { WORK_SCHEDULING } from "../work-scheduling.const.ts";
import type { QueuedTask } from "../tasks/worker-task.types.ts";
import { getWorkClass } from "./worker-admission.ts";
import type { WorkerPoolState } from "./pool.types";
import type { WorkerPoolStatus } from "./pool.types";
import type { WorkerPoolTaskStatus } from "./pool.types";
import { getWorkerTaskHistory } from "./worker-task-history";

function taskStatus(queued: QueuedTask, phase: WorkerPoolTaskStatus["phase"]): WorkerPoolTaskStatus {
  const task = queued.task;
  return {
    requestId: task.requestId,
    taskId: task.taskId,
    type: task.type,
    url: task.url,
    workClass: getWorkClass(task),
    phase,
    item: task.type === "get-quick-info" || task.type === "get-template-bases" ? { ...task.requested } : undefined,
  };
}

export function snapshotWorkerPoolStatus(
  pool: WorkerPoolState | undefined,
  hostTabId: number | undefined,
  maxWorkers: number,
  requestId?: string,
): WorkerPoolStatus {
  const matches = (queued: QueuedTask): boolean => requestId === undefined || queued.task.requestId === requestId;
  const workers = pool?.workers.filter((worker) => worker.generation === pool.generation) ?? [];
  const queuedTasks = (pool?.queue ?? []).filter((queued) => !pool?.admittedTasks.has(queued) && matches(queued))
    .map((queued) => taskStatus(queued, WORK_SCHEDULING.PHASE.QUEUED));
  const activeTasks = Array.from(pool?.admittedTasks ?? []).filter(matches).map((queued) => {
    const worker = workers.find((candidate) => candidate.queuedTask === queued);
    const phase = pool?.queue.includes(queued) ? WORK_SCHEDULING.PHASE.RETRYING
      : worker?.state === "starting" ? WORK_SCHEDULING.PHASE.STARTING : WORK_SCHEDULING.PHASE.EXECUTING;
    return taskStatus(queued, phase);
  });
  const checkedAt = performance.now();
  const occupied = workers.filter((worker) => worker.state !== "idle").length;
  const workerStatuses = workers.map((worker, index) => {
    const queued = worker.queuedTask;
    const phase = queued
      ? pool?.queue.includes(queued) ? WORK_SCHEDULING.PHASE.RETRYING
        : worker.state === "starting" ? WORK_SCHEDULING.PHASE.STARTING : WORK_SCHEDULING.PHASE.EXECUTING
      : undefined;
    return {
      workerNumber: index + 1,
      state: worker.state,
      currentUrl: worker.currentUrl,
      targetKind: worker.target?.kind,
      activeTask: queued && phase ? taskStatus(queued, phase) : undefined,
      noProgressMs: Math.max(0, Math.round(checkedAt - worker.lastProgressAt)),
      recoveryCount: worker.recoveryCount,
    };
  });
  return {
    hostTabId,
    activeBackground: activeTasks.filter((task) => task.workClass === WORK_SCHEDULING.BACKGROUND).length,
    activeForeground: activeTasks.filter((task) => task.workClass === WORK_SCHEDULING.FOREGROUND).length,
    activeTasks,
    capacity: Math.max(0, maxWorkers - occupied),
    maxBackgroundActive: WORK_SCHEDULING.MAX_BACKGROUND_ACTIVE,
    maxWorkers,
    queuedBackground: queuedTasks.filter((task) => task.workClass === WORK_SCHEDULING.BACKGROUND).length,
    queuedForeground: queuedTasks.filter((task) => task.workClass === WORK_SCHEDULING.FOREGROUND).length,
    queuedTasks,
    workerCount: workers.length,
    workers: workerStatuses,
    taskHistory: getWorkerTaskHistory(hostTabId, requestId),
    requestId,
  };
}
