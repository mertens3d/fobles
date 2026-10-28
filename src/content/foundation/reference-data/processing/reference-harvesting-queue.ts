// @source-path [fobles] src/content/foundation/reference-data/processing/reference-harvesting-queue.ts

import { normalizeItemLocator } from "../../cache/sitecore-data/sitecore-data-cache-key";
import type { SitecoreDataFactName } from "../../cache/sitecore-data/sitecore-data-cache.types";
import type { SitecoreItemLocator } from "../../workers/tasks/worker-task.types";

export type ReferenceHarvestingJob = { item: SitecoreItemLocator; factName: SitecoreDataFactName };
export type ReferenceHarvestingProgress = { completed: number; max: number; status: "running" | "complete" };
export type ReferenceHarvestingQueueOptions = {
  runJob: (job: ReferenceHarvestingJob, signal: AbortSignal) => Promise<void>;
  onProgress?: (progress: ReferenceHarvestingProgress) => void;
  onError?: (job: ReferenceHarvestingJob, error: unknown) => void;
};
type QueuedReferenceHarvestingJob = ReferenceHarvestingJob & { onSettled?: (succeeded: boolean) => void };
export type ReferenceHarvestingQueue = {
  enqueue: (job: ReferenceHarvestingJob, onSettled?: (succeeded: boolean) => void) => void;
  pendingCount: () => number;
  dispose: () => void;
};

export function referenceHarvestingJobKey(job: ReferenceHarvestingJob): string {
  const item = normalizeItemLocator(job.item);
  return `${item.kind}:${item.value}:${job.factName}`;
}

export function createReferenceHarvestingQueue({ runJob, onProgress, onError }: ReferenceHarvestingQueueOptions): ReferenceHarvestingQueue {
  const controller = new AbortController();
  const jobs: QueuedReferenceHarvestingJob[] = [];
  const seen = new Set<string>();
  let completed = 0;
  let processing = false;
  let disposed = false;

  function pendingCount(): number { return jobs.length + (processing ? 1 : 0); }
  function reportProgress(): void {
    onProgress?.({ completed, max: seen.size, status: disposed || (!processing && jobs.length === 0) ? "complete" : "running" });
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
          await runJob(job, controller.signal);
          succeeded = true;
        } catch (error: unknown) {
          if (!disposed) onError?.(job, error);
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
  function enqueue(job: ReferenceHarvestingJob, onSettled?: (succeeded: boolean) => void): void {
    const key = referenceHarvestingJobKey(job);
    if (disposed || seen.has(key)) return;
    seen.add(key);
    jobs.push({ ...job, onSettled });
    reportProgress();
    void processJobs();
  }
  function dispose(): void {
    if (disposed) return;
    disposed = true;
    jobs.length = 0;
    controller.abort();
  }
  return { enqueue, pendingCount, dispose };
}
