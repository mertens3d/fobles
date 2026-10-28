// @source-path [fobles] src/content/foundation/reference-data/processing/resolve-fact.ts

import * as cache from "../../cache/sitecore-data/sitecore-data-cache.ts";
import type { SitecoreDataCacheKey, StoredQuickInfo } from "../../cache/sitecore-data/sitecore-data-cache.types";
import type { WorkerTaskExecutionResult } from "../../workers/tasks/worker-task.types";
import type { ItemGraphNodeData } from "../model/sitecore-item.types.ts";

export type ResolveOutcome =
  | { kind: "enriched"; value: ItemGraphNodeData }
  | { kind: "verified"; value: ItemGraphNodeData }
  | { kind: "revision-mismatch"; value: ItemGraphNodeData; hadStructuralCache: boolean }
  | { kind: "unverified"; value: ItemGraphNodeData }
  | { kind: "not-found" }
  | { kind: "failed" };

export type CachedItemFact = { value: ItemGraphNodeData | undefined; revision: string | undefined; hadStructuralCache: boolean };

function restoreQuickInfo(quickInfo: StoredQuickInfo): ItemGraphNodeData {
  const scTemplate = quickInfo.scTemplate
    ? { ...quickInfo.scTemplate, scTemplate: undefined, rawMarkup: undefined, facts: {} }
    : undefined;
  return { ...quickInfo, scTemplate, rawMarkup: undefined, facts: {} };
}

export async function readCachedItemFact(key: SitecoreDataCacheKey): Promise<CachedItemFact | undefined> {
  const record = await cache.getItem(key);
  const quickInfo = record?.quickInfo;
  let fact: CachedItemFact | undefined;

  if (record && quickInfo) {
    const hadStructuralCache = Boolean(
      record.parent || record.children || record.referrers || record.customSections || record.standardSections || record.layout,
    );
    fact = { value: restoreQuickInfo(quickInfo), revision: record.revision, hadStructuralCache };
  }

  return fact;
}

export async function verifyItemFact(
  key: SitecoreDataCacheKey,
  prior: CachedItemFact | undefined,
  fetchLive: () => Promise<WorkerTaskExecutionResult>,
): Promise<ResolveOutcome> {
  let outcome: ResolveOutcome = { kind: "failed" };
  const liveResult = await fetchLive();

  if (liveResult.status === "success" && liveResult.type === "get-quick-info") {
    const { result: resolved, revision } = liveResult.payload;
    if (resolved.status !== "found" || !resolved.value) {
      await cache.deleteItem(key);
      outcome = { kind: "not-found" };
    } else {
      const value = resolved.value;
      await cache.putFact(key, "quickInfo", { result: resolved }, { revision });
      if (revision === undefined) outcome = { kind: "unverified", value };
      else if (!prior) outcome = { kind: "enriched", value };
      else if (prior.revision !== undefined && prior.revision === revision) outcome = { kind: "verified", value };
      else outcome = { kind: "revision-mismatch", value, hadStructuralCache: prior.hadStructuralCache };
    }
  }

  return outcome;
}

export async function resolveItemFact(
  key: SitecoreDataCacheKey,
  fetchLive: () => Promise<WorkerTaskExecutionResult>,
): Promise<ResolveOutcome> {
  const prior = await readCachedItemFact(key);
  return verifyItemFact(key, prior, fetchLive);
}
