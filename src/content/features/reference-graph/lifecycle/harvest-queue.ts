// @source-path [fobles] src/content/features/reference-graph/lifecycle/harvest-queue.ts

import type { PhaseProgress } from "./lifecycle.types";

export type HarvestQueueOptions = {
  runHarvest: (reference: string, signal: AbortSignal) => Promise<void>;
  onProgress?: (progress: PhaseProgress) => void;
  onError?: (reference: string, error: unknown) => void;
};

export type HarvestQueue = {
  // No-op if `reference` is already queued or already settled in this queue's lifetime -
  // an item cannot accumulate duplicate logical harvest work. `onSettled` lets a caller (e.g.
  // Resolve, for a referenced item it found stale) learn when ITS item specifically finishes,
  // without needing to track the whole queue's aggregate progress.
  enqueue: (reference: string, onSettled?: (succeeded: boolean) => void) => void;
  dispose: () => void;
};

// Deliberately NOT a worker pool of its own - every enqueued harvest still runs through the
// existing shared worker pool via the injected `runHarvest` callback; this only dedupes and
// counts logical harvest work at the Reference Graph lifecycle level.
export function createHarvestQueue({ runHarvest, onProgress, onError }: HarvestQueueOptions): HarvestQueue {
  const controller = new AbortController();
  const seen = new Set<string>();
  let completed = 0;
  let disposed = false;

  function reportProgress(): void {
    onProgress?.({
      completed,
      max: seen.size,
      status: disposed || completed >= seen.size ? "complete" : "running",
    });
  }

  function enqueue(reference: string, onSettled?: (succeeded: boolean) => void): void {
    if (disposed || seen.has(reference)) return;

    seen.add(reference);
    reportProgress();

    void runHarvest(reference, controller.signal)
      .then(
        () => {
          if (!disposed) onSettled?.(true);
        },
        (error: unknown) => {
          if (!disposed) {
            onError?.(reference, error);
            onSettled?.(false);
          }
        },
      )
      .finally(() => {
        if (!disposed) {
          completed += 1;
          reportProgress();
        }
      });
  }

  function dispose(): void {
    if (disposed) return;
    disposed = true;
    controller.abort();
  }

  return { enqueue, dispose };
}
