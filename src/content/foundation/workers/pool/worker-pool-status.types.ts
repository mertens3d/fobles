// @source-path [fobles] src/content/foundation/workers/pool/worker-pool-status.types.ts
import type { PoolWorkerState, SitecoreItemLocator, WorkerTaskType } from "../tasks/worker-task.types";
import type { WorkClass } from "../work-scheduling.types";
import type { WORK_SCHEDULING } from "../work-scheduling.const";

export type WorkerPoolTaskStatus = {
  requestId: string;
  taskId: string;
  type: WorkerTaskType;
  url: string;
  workClass: WorkClass;
  phase: typeof WORK_SCHEDULING.PHASE[keyof typeof WORK_SCHEDULING.PHASE];
  item?: SitecoreItemLocator;
};


export type WorkerTaskSnapshot = {
  taskId: string;
  requestId: string;
  type: WorkerTaskType;
  target: string;
  workClass: WorkClass;
  phase: "queued" | "executing" | "completed" | "error" | "cancelled";
  outcome: "success" | "error" | "cancelled" | undefined;
  workerKey: string | undefined;
  activityAt: number;
  elapsedMs: number | undefined;
  recoveryCount: number;
  requestPayload: { value: unknown; truncated: boolean };
  responsePayload: { value: unknown; truncated: boolean } | undefined;
};

export type WorkerPoolWorkerStatus = {
  workerNumber: number;
  state: PoolWorkerState;
  currentUrl: string | undefined;
  targetKind: "iframe" | "tab" | undefined;
  activeTask: WorkerPoolTaskStatus | undefined;
  noProgressMs: number;
  recoveryCount: number;
};

export type WorkerPoolStatus = {
  hostTabId: number | undefined;
  activeBackground: number;
  activeForeground: number;
  activeTasks: WorkerPoolTaskStatus[];
  capacity: number;
  maxBackgroundActive: number;
  maxWorkers: number;
  queuedBackground: number;
  queuedForeground: number;
  queuedTasks: WorkerPoolTaskStatus[];
  workerCount: number;
  workers: WorkerPoolWorkerStatus[];
  taskHistory?: WorkerTaskSnapshot[];
  requestId?: string;
};
