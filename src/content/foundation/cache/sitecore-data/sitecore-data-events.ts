// @source-path [fobles] src/content/foundation/cache/sitecore-data/sitecore-data-events.ts

import { serializeCacheKey } from "./sitecore-data-cache-key.ts";
import type { SitecoreDataCacheKey, SitecoreDataFactName } from "./sitecore-data-cache.types.ts";

type FactListener = () => void;
const listeners = new Map<string, Set<FactListener>>();

function subscriptionKey(key: SitecoreDataCacheKey, factName: SitecoreDataFactName): string {
  return `${serializeCacheKey(key)}::${factName}`;
}

export function publishFactUpdated(key: SitecoreDataCacheKey, factName: SitecoreDataFactName): void {
  listeners.get(subscriptionKey(key, factName))?.forEach((listener) => listener());
}

export function subscribeFactUpdated(
  key: SitecoreDataCacheKey,
  factName: SitecoreDataFactName,
  listener: FactListener,
): () => void {
  const keyName = subscriptionKey(key, factName);
  const subscribers = listeners.get(keyName) ?? new Set<FactListener>();
  subscribers.add(listener);
  listeners.set(keyName, subscribers);
  return () => {
    subscribers.delete(listener);
    if (subscribers.size === 0) {
      listeners.delete(keyName);
    }
  };
}
