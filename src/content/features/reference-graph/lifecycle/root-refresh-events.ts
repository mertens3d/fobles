import type { RootRefreshListener } from "./lifecycle.types.js";
// @source-path [fobles] src/content/features/reference-graph/lifecycle/root-refresh-events.ts

import type { SitecoreHarvestResult } from "../../../foundation/harvesting/sitecore-harvester.types";

const listenersByRootItemId = new Map<string, Set<RootRefreshListener>>();

export function subscribeRootRefresh(rootItemId: string, listener: RootRefreshListener): () => void {
  const listeners = listenersByRootItemId.get(rootItemId) ?? new Set();
  listeners.add(listener);
  listenersByRootItemId.set(rootItemId, listeners);

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      listenersByRootItemId.delete(rootItemId);
    }
  };
}

export function publishRootRefresh(rootItemId: string, result: SitecoreHarvestResult): void {
  listenersByRootItemId.get(rootItemId)?.forEach((listener) => listener(result));
}
