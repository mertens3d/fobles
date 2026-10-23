// @source-path [fobles] src/content/sitecore-harvester/worker-pool/worker-pool-lifecycle.ts

import { extensionLog } from "../../logger";
import {
  closeWorkerTarget,
  sendCancelToWorkerTarget,
} from "../background-tab/worker-target-service";
import type {
  ActiveWorkerTask,
  PoolWorker,
  QueuedTask
} from "./worker-task.types";
import { clearWorkerReadiness } from "./worker-readiness";
import { createCancelledResult } from "./worker-task.types";

const DISPOSAL_DRAIN_TIMEOUT_MS = 10000;
const DISPOSAL_DRAIN_POLL_MS = 50;

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

let poolGeneration = 0;

export function getWorkerPoolGeneration(): number {
  return poolGeneration;
}

export function isWorkerPoolGenerationCurrent(
  generation: number,
): boolean {
  return generation === poolGeneration;
}

export async function disposeWorkerPoolLifecycle({
  workers,
  queue,
  activeTaskByWorkerKey,
  cancelledRequestIds,
  generation,
}: DisposeWorkerPoolOptions): Promise<WorkerPoolDisposalResult> {
  let nextGeneration = poolGeneration;

  if (generation === poolGeneration) {
    poolGeneration += 1;
    nextGeneration = poolGeneration;
  }

  queue.forEach((queued) => {
    queued.resolve(createCancelledResult(queued.task));
  });

  const targets = collectWorkerTargets(workers);
  extensionLog.debug("Worker pool: disposal drain started", {
    previousGeneration: generation, nextGeneration, workerCount: workers.length,
    queuedTaskCount: queue.length, activeTaskCount: activeTaskByWorkerKey.size,
    timeoutMs: DISPOSAL_DRAIN_TIMEOUT_MS, targets,
  });
  const drained = await waitForActiveTasksToDrain(activeTaskByWorkerKey);
  if (!drained) {
    extensionLog.warn("Worker pool: disposal drain timed out; forcing cleanup", {
      activeTaskCount: activeTaskByWorkerKey.size, timeoutMs: DISPOSAL_DRAIN_TIMEOUT_MS,
    });
    activeTaskByWorkerKey.forEach((active) => {
      cancelledRequestIds.add(active.requestId);
      sendCancelToWorkerTarget(active.target, active.requestId, active.taskId);
    });
  } else {
    extensionLog.debug("Worker pool: disposal drain complete", { activeTaskCount: 0 });
  }
  activeTaskByWorkerKey.clear();
  clearWorkerReadiness();
  await Promise.all(
    targets.map((target) =>
      closeWorkerTarget(target),
    ),
  );

  cancelledRequestIds.clear();

  extensionLog.debug("Worker pool: disposed", {
    generation: nextGeneration,
    closedTargets: targets,
  });

  return {
    generation: nextGeneration,
  };
}

async function waitForActiveTasksToDrain(
  activeTasks: Map<string, ActiveWorkerTask>,
): Promise<boolean> {
  const deadline = Date.now() + DISPOSAL_DRAIN_TIMEOUT_MS;
  while (activeTasks.size > 0 && Date.now() < deadline) {
    await new Promise<void>((resolve) => setTimeout(resolve, DISPOSAL_DRAIN_POLL_MS));
  }
  return activeTasks.size === 0;
}

function collectWorkerTargets(
  workers: readonly PoolWorker[],
): NonNullable<PoolWorker["target"]>[] {
  const targetsByKey = new Map<
    string,
    NonNullable<PoolWorker["target"]>
  >();

  workers.forEach((worker) => {
    const target = worker.target;

    if (target) {
      const key =
        target.kind === "tab"
          ? `tab:${target.tabId}`
          : `iframe:${target.workerId}`;

      targetsByKey.set(key, target);
    }
  });

  return Array.from(targetsByKey.values());
}

function resetTabReadiness(
  tabId: number,
): void {
  // clearWorkerReadiness() already clears the readiness registry globally.
  // This function preserves an explicit tab-target lifecycle boundary.
  void tabId;
}