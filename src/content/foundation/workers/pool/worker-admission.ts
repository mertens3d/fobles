import { WORK_SCHEDULING } from "../work-scheduling.const.ts";
import type { WorkClass } from "../work-scheduling.types.ts";
import type { QueuedTask } from "../tasks/tasks.types";
import type { WorkerTask } from "../tasks/tasks.types";
import type { WorkerPoolState } from "./pool.types";
import { backgroundCooldownRemaining } from "./worker-background-cooldown.ts";

export function getWorkClass(task: WorkerTask): WorkClass {
  return task.workClass ?? WORK_SCHEDULING.FOREGROUND;
}

export function takeNextWorkerTask(pool: WorkerPoolState, maxWorkers: number, cooldownMs = 0): QueuedTask | undefined {
  const workers = pool.workers.filter((worker) => worker.generation === pool.generation && worker.state !== "retired");
  const occupied = workers.filter((worker) => worker.state !== "idle").length;
  const hasCapacity = occupied < maxWorkers && (workers.some((worker) => worker.state === "idle") || workers.length < maxWorkers);
  let next: QueuedTask | undefined;
  if (hasCapacity) {
    const foregroundIndex = pool.queue.findIndex((queued) => getWorkClass(queued.task) === WORK_SCHEDULING.FOREGROUND);
    const backgroundActive = Array.from(pool.admittedTasks).filter(
      (queued) => getWorkClass(queued.task) === WORK_SCHEDULING.BACKGROUND,
    ).length;
    const index = foregroundIndex >= 0 ? foregroundIndex : pool.queue.findIndex(
      (queued) => pool.admittedTasks.has(queued) ||
        (backgroundActive < WORK_SCHEDULING.MAX_BACKGROUND_ACTIVE && backgroundCooldownRemaining(pool, cooldownMs) === 0),
    );
    if (index >= 0) {
      [next] = pool.queue.splice(index, 1);
      pool.admittedTasks.add(next);
      if (next.retryQueuedAt !== undefined) {
        next.deadlineAt += performance.now() - next.retryQueuedAt;
        next.retryQueuedAt = undefined;
      } else if (getWorkClass(next.task) === WORK_SCHEDULING.BACKGROUND) {
        next.deadlineAt += performance.now() - next.submittedAt;
      }
    }
  }
  return next;
}