// @source-path [fobles] src/content/foundation/reference-data/processing/resolve-fact.ts
import type { ItemGraphNodeData } from "../model/sitecore-item.types.ts";
import * as cache from "../../cache/sitecore-data/sitecore-data-cache.ts";
import type { SitecoreDataCacheKey } from "../../cache/sitecore-data/sitecore-data-cache.types";
import type { WorkerTaskExecutionResult } from "../../workers/tasks/worker-task.types";
export type ResolveOutcome =
  // No prior cache for this item - the live read both supplies display data and seeds the cache.
  | { kind: "enriched"; value: ItemGraphNodeData }
  // Prior cache existed and its revision still matches the live read - cache is re-verified.
  | { kind: "verified"; value: ItemGraphNodeData }
  // Prior cache existed but its revision no longer matches - display data is refreshed; the
  // caller decides whether this item's cached structural facts also need a re-harvest.
  | { kind: "stale"; value: ItemGraphNodeData; hadStructuralCache: boolean }
  // The live read couldn't supply a revision at all - never conflated with "stale", since there
  // is nothing to compare against (a missing/unreadable revision is not a revision mismatch).
  | { kind: "unverified"; value: ItemGraphNodeData }
  // The item does not exist live. Any cached record for it has been evicted so it cannot hydrate a ghost later.
  | { kind: "not-found" }
  // The live read itself failed. The cache record is left untouched; the caller must not keep showing cached values.
  | { kind: "failed" };
// What the cache already knows about an item, read once so hydrate (display) and verify (live) share it.
// `value` is undefined when the cached quick-info is itself a cached not-found - nothing to display.
export type CachedItemFact = { value: ItemGraphNodeData | undefined; revision: string | undefined; hadStructuralCache: boolean };
// Local read only (no worker). Undefined means a cache miss: no quick-info fact exists for this item.
export async function readCachedItemFact(key: SitecoreDataCacheKey): Promise<CachedItemFact | undefined> {
  const record = await cache.getItem(key);
  const quickInfo = record?.quickInfo;
  let fact: CachedItemFact | undefined;
  if (record && quickInfo) {
    const result = quickInfo.value.result;
    const hadStructuralCache = Boolean(record.parent || record.children || record.referrers || record.customSections || record.standardSections || record.layout);
    fact = { value: result.status === "found" ? result.value : undefined, revision: quickInfo.value.revision, hadStructuralCache };
  }
  return fact;
}
// Validation and enrichment are the SAME worker operation (one live get-quick-info read per
// unique item supplies quick-info + revision together) - this is the one function that performs
// that read and interprets it against what the cache already knew (`prior`), never two separate loads.
export async function verifyItemFact(key: SitecoreDataCacheKey, prior: CachedItemFact | undefined, fetchLive: () => Promise<WorkerTaskExecutionResult>): Promise<ResolveOutcome> {
  let outcome: ResolveOutcome = { kind: "failed" };
  const liveResult = await fetchLive();
  if (liveResult.status === "success" && liveResult.type === "get-quick-info") {
    const { result: resolved, revision } = liveResult.payload;
    if (resolved.status !== "found" || !resolved.value) {
      await cache.deleteItem(key);
      outcome = { kind: "not-found" };
    } else {
      const value = resolved.value;
      if (revision === undefined) {
        // Cache the display data for convenience, but never claim a verification we can't make.
        await cache.putFact(key, "quickInfo", { result: resolved, revision });
        outcome = { kind: "unverified", value };
      } else if (!prior) {
        await cache.putFact(key, "quickInfo", { result: resolved, revision });
        outcome = { kind: "enriched", value };
      } else if (prior.revision !== undefined && prior.revision === revision) {
        await cache.putFact(key, "quickInfo", { result: resolved, revision }, { verifiedAt: Date.now() });
        outcome = { kind: "verified", value };
      } else {
        await cache.putFact(key, "quickInfo", { result: resolved, revision });
        outcome = { kind: "stale", value, hadStructuralCache: prior.hadStructuralCache };
      }
    }
  }
  return outcome;
}
export async function resolveItemFact(key: SitecoreDataCacheKey, fetchLive: () => Promise<WorkerTaskExecutionResult>): Promise<ResolveOutcome> {
  const prior = await readCachedItemFact(key);
  return verifyItemFact(key, prior, fetchLive);
}
