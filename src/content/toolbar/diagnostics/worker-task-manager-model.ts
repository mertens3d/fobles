// @source-path [fobles] src/content/toolbar/diagnostics/worker-task-manager-model.ts
import type { ActivityEvent } from "../../shared/activity/activity-events";
import type { WorkerPoolStatus } from "../../foundation/workers/pool/worker-pool-status.types";

export type WorkerTaskManagerRow = {
  id: string;
  activityAt: number;
  worker: string;
  status: string;
  task: string;
  target: string;
  workClass: string;
  phase: string;
  outcome: string;
  recoveries: number;
};

export const WORKER_TASK_MANAGER_HISTORY_MAX = 100;

function outcomeFor(activity: ActivityEvent): string {
  if (activity.state === "completed") { return activity.detail === "success" ? "Success" : "Completed"; }
  if (activity.state === "error") { return "Error"; }
  if (activity.state === "cancelled") { return "Cancelled"; }
  return "—";
}

function phaseFor(activity: ActivityEvent): string {
  if (activity.state === "started") { return "Executing"; }
  if (activity.state === "completed") { return "Completed"; }
  if (activity.state === "error") { return "Failed"; }
  if (activity.state === "cancelled") { return "Cancelled"; }
  return activity.state;
}

export function updateRowsFromActivity(rows: readonly WorkerTaskManagerRow[], activity: ActivityEvent): WorkerTaskManagerRow[] {
  if (activity.source !== "worker" || !activity.activityId) { return [...rows]; }
  const old = rows.find((row) => row.id === activity.activityId);
  const next: WorkerTaskManagerRow = {
    id: activity.activityId,
    activityAt: activity.timestamp,
    worker: activity.detail?.startsWith("iframe:") || activity.detail?.startsWith("tab:") ? activity.detail : old?.worker ?? "—",
    status: activity.state === "started" ? "Active" : "Disposed",
    task: activity.label,
    target: old?.target ?? "—",
    workClass: activity.workClass === "foreground" ? "FG" : activity.workClass === "background" ? "BG" : old?.workClass ?? "—",
    phase: phaseFor(activity),
    outcome: outcomeFor(activity),
    recoveries: old?.recoveries ?? 0,
  };
  return [next, ...rows.filter((row) => row.id !== next.id)].slice(0, WORKER_TASK_MANAGER_HISTORY_MAX);
}

export function reconcileActiveRows(rows: readonly WorkerTaskManagerRow[], status: WorkerPoolStatus | undefined, now = Date.now()): WorkerTaskManagerRow[] {
  let next = [...rows];
  for (const worker of status?.workers ?? []) {
    const task = worker.activeTask;
    if (!task) { continue; }
    const existing = next.find((row) => row.id === task.taskId);
    const reconciled: WorkerTaskManagerRow = {
      id: task.taskId,
      activityAt: existing?.activityAt ?? now,
      worker: worker.targetKind ? `${worker.targetKind}:${worker.workerNumber}` : String(worker.workerNumber),
      status: worker.state,
      task: existing?.task ?? task.type,
      target: task.item?.value ?? worker.currentUrl ?? existing?.target ?? "—",
      workClass: task.workClass === "foreground" ? "FG" : "BG",
      phase: existing?.phase ?? task.phase,
      outcome: existing?.outcome ?? "—",
      recoveries: worker.recoveryCount,
    };
    next = [reconciled, ...next.filter((row) => row.id !== reconciled.id)];
  }
  return next.slice(0, WORKER_TASK_MANAGER_HISTORY_MAX);
}
