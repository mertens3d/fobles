import type { SitecoreItemLocator, WorkerTaskType } from "../tasks/worker-task.types";
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
  requestId?: string;
};