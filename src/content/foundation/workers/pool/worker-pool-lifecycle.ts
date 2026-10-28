// @source-path [fobles] src/content/foundation/workers/pool/worker-pool-lifecycle.ts
import { extensionLog } from "../../../logger";
import { closeWorkerTarget, sendCancelToWorkerTarget } from "../transport/worker-target-service";
import type { ActiveWorkerTask, PoolWorker, QueuedTask } from "../tasks/worker-task.types";
import { clearWorkerReadiness } from "./worker-readiness";
import { createCancelledResult } from "../tasks/worker-task.types";
type DisposeWorkerPoolOptions = {
    workers: PoolWorker[];
    queue: QueuedTask[];
    activeTaskByWorkerKey: Map<string, ActiveWorkerTask>;
    cancelledRequestIds: Set<string>;
    generation: number;
};
export type WorkerPoolDisposalResult = {
    generation: number;
};
export async function disposeWorkerPoolLifecycle({ workers, queue, activeTaskByWorkerKey, cancelledRequestIds, generation }: DisposeWorkerPoolOptions): Promise<WorkerPoolDisposalResult> {
    const nextGeneration = generation + 1;
    queue.forEach((queued) => queued.resolve(createCancelledResult(queued.task)));
    const active = Array.from(activeTaskByWorkerKey.values());
    active.forEach((task) => {
        cancelledRequestIds.add(task.requestId);
        sendCancelToWorkerTarget(task.target, task.requestId, task.taskId);
    });
    activeTaskByWorkerKey.clear();
    clearWorkerReadiness();
    const targets = collectWorkerTargets(workers);
    extensionLog.debug("Worker pool: immediate disposal started", { previousGeneration: generation, nextGeneration, workerCount: workers.length, queuedTaskCount: queue.length, activeTaskCount: active.length, targetCount: targets.length });
    const closeResults = await Promise.allSettled(targets.map((target) => closeWorkerTarget(target)));
    closeResults.forEach((result, index) => {
        if (result.status === "rejected")
            extensionLog.warn("Worker pool: target cleanup failed during disposal", { target: targets[index], error: result.reason as unknown });
    });
    cancelledRequestIds.clear();
    extensionLog.debug("Worker pool: disposed", { generation: nextGeneration, closedTargets: targets, failedTargetCount: closeResults.filter((result) => result.status === "rejected").length });
    return { generation: nextGeneration };
}
function collectWorkerTargets(workers: readonly PoolWorker[]): NonNullable<PoolWorker["target"]>[] {
    const targetsByKey = new Map<string, NonNullable<PoolWorker["target"]>>();
    workers.forEach((worker) => {
        const target = worker.target;
        if (target)
            targetsByKey.set(target.kind === "tab" ? `tab:${target.tabId}` : `iframe:${target.workerId}`, target);
    });
    return Array.from(targetsByKey.values());
}
