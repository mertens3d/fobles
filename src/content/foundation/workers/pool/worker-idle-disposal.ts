// @source-path [fobles] src/content/foundation/workers/pool/worker-idle-disposal.ts
import { extensionLog } from "../../../logger";
import type { DestroyIdleWorker } from "./pool.types";
import type { WorkerPoolState } from "./pool.types";
import { WORKER_IDLE_DISPOSAL_DELAY_MS } from "./pool.const";

export function cancelWorkerIdleDisposal(pool: WorkerPoolState): void {
  if (pool.idleDisposalTimer === undefined) {
    return;
  }
  clearTimeout(pool.idleDisposalTimer);
  pool.idleDisposalTimer = undefined;
}

export function scheduleWorkerIdleDisposal(pool: WorkerPoolState, destroyWorker: DestroyIdleWorker): void {
  cancelWorkerIdleDisposal(pool);
  if (pool.queue.length > 0 || pool.activeTaskByWorkerKey.size > 0) {
    return;
  }
  if (!pool.workers.some((worker) => worker.state === "idle")) {
    return;
  }
  pool.idleDisposalTimer = setTimeout(() => {
    pool.idleDisposalTimer = undefined;
    if (pool.queue.length > 0 || pool.activeTaskByWorkerKey.size > 0) {
      return;
    }
    const idleWorkers = pool.workers.filter((worker) => worker.state === "idle");
    extensionLog.debug("Worker pool: idle grace expired; disposing idle workers", {
      hostTabId: pool.hostTabId,
      graceMs: WORKER_IDLE_DISPOSAL_DELAY_MS,
      idleWorkerCount: idleWorkers.length,
    });
    idleWorkers.forEach((worker) => void destroyWorker(worker, "idle-grace-expired"));
  }, WORKER_IDLE_DISPOSAL_DELAY_MS);
}
