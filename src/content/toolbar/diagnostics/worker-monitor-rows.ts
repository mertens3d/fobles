// @source-path [fobles] src/content/toolbar/diagnostics/worker-monitor-rows.ts

import type { WorkerPoolWorkerStatus } from "../../foundation/workers/pool/pool.types";
import type { WorkerTaskSnapshot } from "../../foundation/workers/pool/pool.types";
import { getWorkProgressLabel } from "../../foundation/workers/progress/work-progress-registry";
import { DIAGNOSTIC_OPERATION_LABELS } from "./toolbar-diagnostics.const";
import { WORKER_MONITOR_EMPTY_CELL } from "./worker-monitor.const";
import type { WorkerMonitorRow } from "./worker-monitor-row.types";

const EMPTY = WORKER_MONITOR_EMPTY_CELL;

function objectValue(value: unknown, key: string): unknown {
  return value && typeof value === "object" && key in value ? (value as Record<string, unknown>)[key] : undefined;
}

function textOrEmpty(value: unknown): string {
  return typeof value === "string" && value ? value : EMPTY;
}

// Agent: Payloads come from worker iframes and may be truncated or malformed, so every level is guarded.
export function workerTaskItemName(entry: WorkerTaskSnapshot | undefined): string {
  const response = entry?.responsePayload?.value;
  const resolved = objectValue(objectValue(objectValue(objectValue(response, "payload"), "result"), "value"), "scItemName");
  const requested = objectValue(entry?.requestPayload?.value, "requested");
  const requestedName = objectValue(requested, "scItemName") ?? objectValue(requested, "name");
  return typeof resolved === "string" && resolved ? resolved : textOrEmpty(requestedName);
}

function shortTarget(value: string | undefined): string {
  return !value ? EMPTY : value.length <= 12 ? value : `${value.slice(0, 7)}\u2026`;
}

function shortWorker(workerKey: string | undefined): string {
  return workerKey ? workerKey.replace(/^(iframe|tab):/, "").slice(0, 7) : EMPTY;
}

function sessionLabel(requestId: string | undefined): string {
  return (requestId ? getWorkProgressLabel(requestId) : undefined) ?? EMPTY;
}

function classLabel(workClass: string | undefined): string {
  return workClass === "foreground" ? "FG" : workClass === "background" ? "BG" : EMPTY;
}

function timeLabel(activityAt: number | undefined): string {
  return typeof activityAt === "number" && Number.isFinite(activityAt) ? new Date(activityAt).toLocaleTimeString() : EMPTY;
}

// Agent: A settled task. Live-worker columns (State, No Progress, URL) are empty.
export function historyMonitorRow(entry: WorkerTaskSnapshot): WorkerMonitorRow {
  return {
    key: entry.taskId, time: timeLabel(entry.activityAt), worker: shortWorker(entry.workerKey),
    workerTitle: entry.workerKey ?? "", state: EMPTY, session: sessionLabel(entry.requestId),
    task: DIAGNOSTIC_OPERATION_LABELS[entry.type] ?? entry.type, itemName: workerTaskItemName(entry),
    target: shortTarget(entry.target), targetTitle: entry.target ?? "", workClass: classLabel(entry.workClass),
    workClassTitle: entry.workClass ?? "", phase: entry.phase ?? EMPTY, outcome: entry.outcome ?? EMPTY,
    recoveries: String(entry.recoveryCount ?? 0), recoveriesTitle: "Recovery attempts for this task.",
    noProgress: EMPTY, url: EMPTY, snapshot: entry,
  };
}

// Agent: A live worker slot. Its task columns come from the task it is running (empty when idle); Outcome is empty
// Agent: because a running task has none yet.
export function liveWorkerMonitorRow(worker: WorkerPoolWorkerStatus, history: readonly WorkerTaskSnapshot[]): WorkerMonitorRow {
  const task = worker.activeTask;
  const snapshot = task ? history.find((entry) => entry.taskId === task.taskId) : undefined;
  const target = snapshot?.target ?? task?.url;
  return {
    key: `worker-${worker.workerNumber}`, time: timeLabel(snapshot?.activityAt),
    worker: worker.workerKey ? shortWorker(worker.workerKey) : `#${worker.workerNumber}`,
    workerTitle: `Worker ${worker.workerNumber}${worker.workerKey ? ` \u00b7 ${worker.workerKey}` : ""}`,
    state: worker.state ?? EMPTY, session: sessionLabel(task?.requestId),
    task: task ? DIAGNOSTIC_OPERATION_LABELS[task.type] ?? task.type : EMPTY, itemName: workerTaskItemName(snapshot),
    target: shortTarget(target), targetTitle: target ?? "", workClass: classLabel(task?.workClass),
    workClassTitle: task?.workClass ?? "", phase: task?.phase ?? EMPTY, outcome: EMPTY,
    recoveries: snapshot ? String(snapshot.recoveryCount ?? 0) : EMPTY,
    recoveriesTitle: `Worker total: ${worker.recoveryCount ?? 0}`,
    noProgress: `${worker.noProgressMs ?? 0} ms`, url: textOrEmpty(worker.currentUrl), snapshot,
  };
}
