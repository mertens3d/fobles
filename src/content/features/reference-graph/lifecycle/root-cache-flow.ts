// @source-path [fobles] src/content/features/reference-graph/lifecycle/root-cache-flow.ts

import type { SitecoreHarvestFiltersState, SitecoreHarvestResult } from "../../../sitecore-harvester/sitecore-harvester.types";
import type { SitecoreDataCacheRecord } from "../../../sitecore-data-cache/sitecore-data-cache.types";
import type { RootItem } from "../../reference-model/sitecore-item.types";
import type { ProcessingStatus } from "../../../shared/reference-model-processing/processing-state";

export type RootCacheDecision =
  // Cached revision matches the live revision - cached data is trusted as-is, no re-harvest.
  | { kind: "cache-only"; result: SitecoreHarvestResult }
  // Cached revision differs from live - cached data is shown immediately, but a fresh
  // re-harvest is required to converge on authoritative data.
  | { kind: "cache-then-reharvest"; result: SitecoreHarvestResult }
  // The live revision couldn't be read at all - never conflated with a mismatch. Cached data is
  // still shown immediately, but it's neither re-verified (lastVerifiedAt untouched) nor
  // automatically queued for re-harvest merely because revision was unavailable.
  | { kind: "cache-unverified"; result: SitecoreHarvestResult }
  // No usable cached root data (miss, or insufficient facts for the current filters) - fall
  // back to the existing, unconditional harvest.
  | { kind: "harvest-required" };

// Mirrors harvest-task-planner's COLLECTOR_TASK_TYPE_BY_FILTER_KEY mapping: only the filters that
// are actually enabled need their corresponding cache fact present.
function hasRequiredFacts(record: SitecoreDataCacheRecord, filters: SitecoreHarvestFiltersState): boolean {
  if (filters.parent && !record.parent) return false;
  if (filters.children && !record.children) return false;
  if (filters.referrers && !record.referrers) return false;
  if (filters.customFields && !record.customSections) return false;
  if (filters.standardFields && !record.standardSections) return false;
  if (filters.layouts && !record.layout) return false;

  return true;
}

// The cache stores each collector fact independently (Phase 3B) - reassembling them into a
// SitecoreHarvestResult is the one place that shape difference needs bridging back.
export function assembleHarvestResultFromCacheRecord(
  record: SitecoreDataCacheRecord | undefined,
  filters: SitecoreHarvestFiltersState,
): SitecoreHarvestResult | undefined {
  if (!record?.quickInfo) return undefined;

  const resolved = record.quickInfo.value.result;
  if (resolved.status !== "found" || !resolved.value?.scItemId) return undefined;
  if (!hasRequiredFacts(record, filters)) return undefined;

  const rootItem: RootItem = { ...resolved.value, scItemId: resolved.value.scItemId };

  return {
    rootItem,
    parent: filters.parent ? record.parent?.value.parent : undefined,
    childItems: filters.children ? record.children?.value.childItems : undefined,
    referrers: filters.referrers ? record.referrers?.value.referrers : undefined,
    customFieldSections: filters.customFields ? record.customSections?.value.sections : undefined,
    standardFieldSections: filters.standardFields ? record.standardSections?.value.sections : undefined,
    layoutSectionFields: filters.layouts ? record.layout?.value.layoutSectionFields : undefined,
  };
}

// The INITIAL ROOT FLOW decision point - cheap (no worker call): the live revision is read
// directly from the current Content Editor page's own header icon, never from a worker task.
export function decideRootCacheUsage(
  record: SitecoreDataCacheRecord | undefined,
  filters: SitecoreHarvestFiltersState,
  liveRevision: string | undefined,
): RootCacheDecision {
  const result = assembleHarvestResultFromCacheRecord(record, filters);
  if (!result) return { kind: "harvest-required" };

  // An unreadable live revision is not a revision mismatch - the cache is still shown, just
  // never claimed as re-verified, and never auto-queued for re-harvest on this basis alone.
  if (liveRevision === undefined) return { kind: "cache-unverified", result };

  const cachedRevision = record?.quickInfo?.value.revision;

  return cachedRevision === liveRevision
    ? { kind: "cache-only", result }
    : { kind: "cache-then-reharvest", result };
}

// Seeds the root node's own trust badge from whichever branch produced its data - a fresh
// harvest (or a harvest-required fallback) is always trustworthy the moment it completes.
export function rootProcessingStateForDecision(decisionKind: RootCacheDecision["kind"]): ProcessingStatus {
  switch (decisionKind) {
    case "cache-only": return "verified";
    case "cache-then-reharvest": return "stale";
    case "cache-unverified": return "unverified";
    case "harvest-required": return "enriched";
  }
}
