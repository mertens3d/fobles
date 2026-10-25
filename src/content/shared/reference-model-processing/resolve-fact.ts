// @source-path [fobles] src/content/shared/reference-model-processing/resolve-fact.ts

import type { ItemGraphNodeData } from "../../features/reference-model/sitecore-item.types.ts";
import * as cache from "../../sitecore-data-cache/sitecore-data-cache.ts";
import type { SitecoreDataCacheKey } from "../../sitecore-data-cache/sitecore-data-cache.types";
import type { WorkerTaskExecutionResult } from "../../sitecore-worker/tasks/worker-task.types";

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
  | { kind: "not-found" }
  | { kind: "failed" };

// Validation and enrichment are the SAME worker operation (one live get-quick-info read per
// unique item supplies quick-info + revision together) - this is the one function that performs
// that read and interprets it against whatever the cache already knows, never two separate loads.
export async function resolveItemFact(
  key: SitecoreDataCacheKey,
  fetchLive: () => Promise<WorkerTaskExecutionResult>,
): Promise<ResolveOutcome> {
  const priorRecord = await cache.getItem(key);
  const priorQuickInfo = priorRecord?.quickInfo;

  const liveResult = await fetchLive();

  if (liveResult.status !== "success" || liveResult.type !== "get-quick-info") {
    return { kind: "failed" };
  }

  const { result: resolved, revision } = liveResult.payload;

  if (resolved.status !== "found" || !resolved.value) {
    return { kind: "not-found" };
  }

  const value = resolved.value;

  // Cache the display data for convenience, but never claim a verification we can't make.
  if (revision === undefined) {
    await cache.putFact(key, "quickInfo", { result: resolved, revision });

    return { kind: "unverified", value };
  }

  if (!priorQuickInfo) {
    await cache.putFact(key, "quickInfo", { result: resolved, revision });

    return { kind: "enriched", value };
  }

  const revisionMatches = priorQuickInfo.value.revision !== undefined && priorQuickInfo.value.revision === revision;

  if (revisionMatches) {
    await cache.putFact(key, "quickInfo", { result: resolved, revision }, { verifiedAt: Date.now() });

    return { kind: "verified", value };
  }

  const hadStructuralCache = Boolean(
    priorRecord?.parent ||
    priorRecord?.children ||
    priorRecord?.referrers ||
    priorRecord?.customSections ||
    priorRecord?.standardSections ||
    priorRecord?.layout,
  );

  await cache.putFact(key, "quickInfo", { result: resolved, revision });

  return { kind: "stale", value, hadStructuralCache };
}
