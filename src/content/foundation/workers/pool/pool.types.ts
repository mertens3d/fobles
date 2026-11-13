import type { WorkerIframeTarget } from "../iframe/iframe.types";
import type { ActiveWorkerTask } from "../tasks/tasks.types";
import type { QueuedTask } from "../tasks/tasks.types";
import type { PoolWorker } from "../tasks/tasks.types";
import type { PoolWorkerState } from "../tasks/tasks.types";
import type { WorkerTaskType } from "../tasks/tasks.types";
import type { SitecoreItemLocator } from "../tasks/tasks.types";
import type { WORK_SCHEDULING } from "../work-scheduling.const";
import type { WorkClass } from "../work-scheduling.types";

export type DestroyIdleWorker = (worker: PoolWorker, reason: string) => Promise<void>;

export type DisposeWorkerPoolOptions = {
  workers: PoolWorker[];
  queue: QueuedTask[];
  activeTaskByWorkerKey: Map<string, ActiveWorkerTask>;
  cancelledRequestIds: Set<string>;
  generation: number;
};

export type WorkerPoolDisposalResult = { generation: number };

export type WorkerPoolState = {
  hostTabId: number | undefined;
  generation: number;
  workers: PoolWorker[];
  queue: QueuedTask[];
  admittedTasks: Set<QueuedTask>;
  cancelledRequestIds: Set<string>;
  activeTaskByWorkerKey: Map<string, ActiveWorkerTask>;
  lastProgressAt: number;
  recoveryCount: number;
  healthTimer: ReturnType<typeof setInterval> | undefined;
  idleDisposalTimer: ReturnType<typeof setTimeout> | undefined;
  backgroundCompletedAt?: number;
  backgroundCooldownTimer?: ReturnType<typeof setTimeout>;
};

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

export type WorkerTabTarget = { kind: "tab"; tabId: number };

export type WorkerTarget = WorkerTabTarget | WorkerIframeTarget;
