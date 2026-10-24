// @source-path [fobles] src/content/features/reference-graph/lifecycle/active-harvest-queue.ts

import type { HarvestQueue } from "./harvest-queue";
import type { PhaseProgress } from "./lifecycle.types";

// One Harvest queue per open Reference Graph session, set by ReferenceGraphSession - mirrors the
// existing activeController (enrichment) singleton pattern in enrichment-controller.ts. The
// Resolve path (enrichment-controller.ts) enqueues into whichever queue is currently active
// without needing a callback threaded through every intermediate React hook/prop.
let activeHarvestQueue: HarvestQueue | undefined;
const progressListeners = new Set<(progress: PhaseProgress) => void>();

export function setActiveHarvestQueue(queue: HarvestQueue | undefined): void {
  activeHarvestQueue = queue;
}

export function enqueueHarvest(reference: string, onSettled?: (succeeded: boolean) => void): void {
  activeHarvestQueue?.enqueue(reference, onSettled);
}

export function subscribeHarvestQueueProgress(listener: (progress: PhaseProgress) => void): () => void {
  progressListeners.add(listener);
  return () => progressListeners.delete(listener);
}

export function publishHarvestQueueProgress(progress: PhaseProgress): void {
  progressListeners.forEach((listener) => listener(progress));
}
