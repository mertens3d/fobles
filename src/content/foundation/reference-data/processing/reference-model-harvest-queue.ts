// @source-path [fobles] src/content/foundation/reference-data/processing/reference-model-harvest-queue.ts

export type ReferenceModelHarvestProgress = { completed: number; max: number; status: "running" | "complete" };

export type ReferenceModelHarvestQueueOptions = {
  runHarvest: (reference: string, signal: AbortSignal) => Promise<void>;
  onProgress?: (progress: ReferenceModelHarvestProgress) => void;
  onError?: (reference: string, error: unknown) => void;
};

type ReferenceModelHarvestJob = { reference: string; onSettled?: (succeeded: boolean) => void };

export type ReferenceModelHarvestQueue = {
  // No-op if `reference` is already queued, active, or settled in this queue's lifetime.
  // Jobs added while processing are appended and consumed by the same queue lifecycle.
  enqueue: (reference: string, onSettled?: (succeeded: boolean) => void) => void;
  dispose: () => void;
};

// This is a logical Reference Harvesting queue, not another worker pool. Each job still delegates
// its live work to the shared worker infrastructure through runHarvest. FIFO execution keeps the
// Sitecore editor-state lifecycle serialized while allowing newly discovered jobs to be appended.
export function createReferenceModelHarvestQueue({
  runHarvest,
  onProgress,
  onError,
}: ReferenceModelHarvestQueueOptions): ReferenceModelHarvestQueue {
  const controller = new AbortController();
  const jobs: ReferenceModelHarvestJob[] = [];
  const seen = new Set<string>();
  let completed = 0;
  let processing = false;
  let disposed = false;

  function reportProgress(): void {
    onProgress?.({
      completed,
      max: seen.size,
      status: disposed || (!processing && jobs.length === 0 && completed >= seen.size) ? "complete" : "running",
    });
  }

  async function processJobs(): Promise<void> {
    if (processing || disposed) return;

    processing = true;
    reportProgress();

    try {
      while (!disposed && jobs.length > 0) {
        const job = jobs.shift();
        if (!job) continue;

        let succeeded = false;

        try {
          await runHarvest(job.reference, controller.signal);
          succeeded = true;
        } catch (error: unknown) {
          if (!disposed) onError?.(job.reference, error);
        } finally {
          if (!disposed) {
            completed += 1;
            job.onSettled?.(succeeded);
            reportProgress();
          }
        }
      }
    } finally {
      processing = false;

      if (!disposed) {
        reportProgress();
        if (jobs.length > 0) void processJobs();
      }
    }
  }

  function enqueue(reference: string, onSettled?: (succeeded: boolean) => void): void {
    if (disposed || seen.has(reference)) return;

    seen.add(reference);
    jobs.push({ reference, onSettled });
    reportProgress();
    void processJobs();
  }

  function dispose(): void {
    if (disposed) return;

    disposed = true;
    jobs.length = 0;
    controller.abort();
  }

  return { enqueue, dispose };
}