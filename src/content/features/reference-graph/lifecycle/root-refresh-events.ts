// @source-path [fobles] src/content/features/reference-graph/lifecycle/root-refresh-events.ts

import type { SitecoreHarvestResult } from "../../../sitecore-harvester/sitecore-harvester.types";

// A background root re-harvest (triggered by a stale root cache revision) completes after the
// graph is already open and rendered - this is the one channel it uses to hand the fresh result
// back to whichever ReferenceGraphApp instance currently has that root open, mirroring the
// existing activity-events pub/sub pattern rather than threading a new prop through the modal.
type RootRefreshListener = (result: SitecoreHarvestResult) => void;

const listenersByRootItemId = new Map<string, Set<RootRefreshListener>>();

export function subscribeRootRefresh(rootItemId: string, listener: RootRefreshListener): () => void {
  const listeners = listenersByRootItemId.get(rootItemId) ?? new Set();
  listeners.add(listener);
  listenersByRootItemId.set(rootItemId, listeners);

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) listenersByRootItemId.delete(rootItemId);
  };
}

export function publishRootRefresh(rootItemId: string, result: SitecoreHarvestResult): void {
  listenersByRootItemId.get(rootItemId)?.forEach((listener) => listener(result));
}
