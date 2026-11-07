// @source-path [fobles] src/content/foundation/workers/pool/worker-task-history.ts
import { getWorkClass } from "./worker-admission";
import type { WorkerTask, WorkerTaskResult } from "../tasks/worker-task.types";
import type { WorkerTaskSnapshot } from "./worker-pool-status.types";

const historyByHostTabId = new Map<number | undefined, WorkerTaskSnapshot[]>();
const startedAtByTaskId = new Map<string, number>();

function targetFor(task: WorkerTask): string {
  if ("requested" in task) {
    return task.requested.value;
  }
  return task.url;
}

function upsert(hostTabId: number | undefined, snapshot: WorkerTaskSnapshot): void {
  const history = historyByHostTabId.get(hostTabId) ?? [];
  historyByHostTabId.set(hostTabId, [snapshot, ...history.filter((entry) => entry.taskId !== snapshot.taskId)]);
}

export function recordWorkerTaskQueued(hostTabId: number | undefined, task: WorkerTask): void {
  upsert(hostTabId, {
    taskId: task.taskId,
    requestId: task.requestId,
    type: task.type,
    target: targetFor(task),
    workClass: getWorkClass(task),
    phase: "queued",
    outcome: undefined,
    workerKey: undefined,
    activityAt: Date.now(),
    elapsedMs: undefined,
    recoveryCount: 0,
  });
}

export function recordWorkerTaskStarted(hostTabId: number | undefined, task: WorkerTask, workerKey: string, recoveryCount: number): void {
  startedAtByTaskId.set(task.taskId, performance.now());
  upsert(hostTabId, {
    taskId: task.taskId,
    requestId: task.requestId,
    type: task.type,
    target: targetFor(task),
    workClass: getWorkClass(task),
    phase: "executing",
    outcome: undefined,
    workerKey,
    activityAt: Date.now(),
    elapsedMs: undefined,
    recoveryCount,
  });
}

export function recordWorkerTaskSettled(hostTabId: number | undefined, task: WorkerTask, result: WorkerTaskResult, recoveryCount: number): void {
  const history = historyByHostTabId.get(hostTabId) ?? [];
  const previous = history.find((entry) => entry.taskId === task.taskId);
  const startedAt = startedAtByTaskId.get(task.taskId);
  startedAtByTaskId.delete(task.taskId);
  upsert(hostTabId, {
    taskId: task.taskId,
    requestId: task.requestId,
    type: task.type,
    target: previous?.target ?? targetFor(task),
    workClass: getWorkClass(task),
    phase: result.status === "success" ? "completed" : result.status,
    outcome: result.status,
    workerKey: previous?.workerKey,
    activityAt: Date.now(),
    elapsedMs: startedAt === undefined ? undefined : Math.max(0, Math.round(performance.now() - startedAt)),
    recoveryCount,
  });
}

export function getWorkerTaskHistory(hostTabId: number | undefined, requestId?: string): WorkerTaskSnapshot[] {
  const history = historyByHostTabId.get(hostTabId) ?? [];
  return requestId === undefined ? [...history] : history.filter((entry) => entry.requestId === requestId);
}
