// @source-path [fobles] src/content/foundation/reference-data/processing/queue/reference-harvesting-queue.ts

import type { QueuedReferenceHarvestingJob, ReferenceHarvestingJob, ReferenceHarvestingQueue, ReferenceHarvestingQueueOptions } from "../processing.types.ts";
import { normalizeItemLocator } from "../../../cache/sitecore-data/sitecore-data-cache-key.ts";

export function referenceHarvestingJobKey(job: ReferenceHarvestingJob): string {
  const item = normalizeItemLocator(job.item);
  return `${item.kind}:${item.value}:${job.factName}`;
}

export function createReferenceHarvestingQueue({
  runJob,
  onProgress,
  onError,
}: ReferenceHarvestingQueueOptions): ReferenceHarvestingQueue {
  const controller = new AbortController();
  const jobs: QueuedReferenceHarvestingJob[] = [];
  const seen = new Set<string>();
  let completed = 0;
  let processing = false;
  let disposed = false;

  function pendingCount(): number {
    return jobs.length + (processing ? 1 : 0);
  }
  function reportProgress(): void {
    onProgress?.({
      completed,
      max: seen.size,
      status: disposed || (!processing && jobs.length === 0) ? "complete" : "running",
    });
  }
  async function processJobs(): Promise<void> {
    if (processing || disposed) {
      return;
    }
    processing = true;
    reportProgress();
    try {
      while (!disposed && jobs.length > 0) {
        const job = jobs.shift();
        if (!job) {
          continue;
        }
        let succeeded = false;
        try {
          await runJob(job, controller.signal);
          succeeded = true;
        } catch (error: unknown) {
          if (!disposed) {
            onError?.(job, error);
          }
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
        if (jobs.length > 0) {
          void processJobs();
        }
      }
    }
  }
  function enqueue(job: ReferenceHarvestingJob, onSettled?: (succeeded: boolean) => void): void {
    const key = referenceHarvestingJobKey(job);
    if (disposed || seen.has(key)) {
      return;
    }
    seen.add(key);
    jobs.push({ ...job, onSettled });
    reportProgress();
    void processJobs();
  }
  function remove(predicate: (job: ReferenceHarvestingJob) => boolean): number {
    if (disposed) {
      return 0;
    }
    let removed = 0;
    for (let index = jobs.length - 1; index >= 0; index -= 1) {
      const job = jobs[index];
      if (!predicate(job)) {
        continue;
      }
      jobs.splice(index, 1);
      seen.delete(referenceHarvestingJobKey(job));
      job.onSettled?.(false);
      removed += 1;
    }
    if (removed > 0) {
      reportProgress();
    }
    return removed;
  }
  function dispose(): void {
    if (disposed) {
      return;
    }
    disposed = true;
    jobs.length = 0;
    controller.abort();
  }
  return { enqueue, remove, pendingCount, dispose };
}
