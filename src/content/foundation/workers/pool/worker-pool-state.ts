// @source-path [fobles] src/content/foundation/workers/pool/worker-pool-state.ts
import type { ActiveWorkerTask, PoolWorker, QueuedTask } from "../tasks/worker-task.types";
export type WorkerPoolState = {
  hostTabId: number | undefined;
  generation: number;
  workers: PoolWorker[];
  queue: QueuedTask[];
  cancelledRequestIds: Set<string>;
  activeTaskByWorkerKey: Map<string, ActiveWorkerTask>;
  lastProgressAt: number;
  recoveryCount: number;
  healthTimer: ReturnType<typeof setInterval> | undefined;
  idleDisposalTimer: ReturnType<typeof setTimeout> | undefined;
};
