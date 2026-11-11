import type { WorkerPoolState } from "./pool.types";
import { WORK_SCHEDULING } from "../work-scheduling.const.ts";

export function backgroundCooldownRemaining(pool: WorkerPoolState, cooldownMs: number): number {
  return pool.backgroundCompletedAt === undefined ? 0
    : Math.max(0, pool.backgroundCompletedAt + cooldownMs - performance.now());
}

export function cancelBackgroundCooldown(pool: WorkerPoolState): void {
  if (pool.backgroundCooldownTimer !== undefined) {
    clearTimeout(pool.backgroundCooldownTimer);
    pool.backgroundCooldownTimer = undefined;
  }
}

export function scheduleBackgroundCooldown(pool: WorkerPoolState, cooldownMs: number, resume: () => void): void {
  cancelBackgroundCooldown(pool);
  const remaining = backgroundCooldownRemaining(pool, cooldownMs);
  const backgroundActive = Array.from(pool.admittedTasks).some(
    (queued) => queued.task.workClass === WORK_SCHEDULING.BACKGROUND,
  );
  const backgroundWaiting = pool.queue.some(
    (queued) => queued.task.workClass === WORK_SCHEDULING.BACKGROUND,
  );
  if (backgroundWaiting && !backgroundActive && remaining > 0) {
    pool.backgroundCooldownTimer = setTimeout(() => {
      pool.backgroundCooldownTimer = undefined;
      resume();
    }, remaining);
  }
}