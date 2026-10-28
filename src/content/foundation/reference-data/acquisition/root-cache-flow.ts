// @source-path [fobles] src/content/foundation/reference-data/acquisition/root-cache-flow.ts

import type { SitecoreDataCacheRecord } from "../../cache/sitecore-data/sitecore-data-cache.types";
import type { SitecoreHarvestFiltersState, SitecoreHarvestResult } from "../../harvesting/sitecore-harvester.types";
import type { RootItem } from "../model/sitecore-item.types";
import type { ProcessingStatus } from "../processing/processing-state";

export type RootCacheDecision =
  | { kind: "cache-only"; result: SitecoreHarvestResult }
  | { kind: "cache-then-reharvest"; result: SitecoreHarvestResult }
  | { kind: "cache-unverified"; result: SitecoreHarvestResult }
  | { kind: "harvest-required" };

function hasRequiredFacts(record: SitecoreDataCacheRecord, filters: SitecoreHarvestFiltersState): boolean {
  if (filters.parent && !record.parent) return false;
  if (filters.children && !record.children) return false;
  if (filters.referrers && !record.referrers) return false;
  if (filters.customFields && !record.customSections) return false;
  if (filters.standardFields && !record.standardSections) return false;
  if (filters.layouts && !record.layout) return false;
  return true;
}

export function assembleHarvestResultFromCacheRecord(
  record: SitecoreDataCacheRecord | undefined,
  filters: SitecoreHarvestFiltersState,
): SitecoreHarvestResult | undefined {
  if (!record?.quickInfo) return undefined;
  const quickInfo = record.quickInfo;
  if (!quickInfo.scItemId) return undefined;
  if (!hasRequiredFacts(record, filters)) return undefined;
  const scTemplate = quickInfo.scTemplate ? { ...quickInfo.scTemplate, rawMarkup: undefined, facts: {} } : undefined;
  const rootItem: RootItem = { ...quickInfo, scTemplate, rawMarkup: undefined, facts: {}, scItemId: quickInfo.scItemId };
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

export function decideRootCacheUsage(
  record: SitecoreDataCacheRecord | undefined,
  filters: SitecoreHarvestFiltersState,
  liveRevision: string | undefined,
): RootCacheDecision {
  const result = assembleHarvestResultFromCacheRecord(record, filters);
  if (!result) return { kind: "harvest-required" };
  if (liveRevision === undefined) return { kind: "cache-unverified", result };
  return record?.revision === liveRevision ? { kind: "cache-only", result } : { kind: "cache-then-reharvest", result };
}

export function rootProcessingStateForDecision(decisionKind: RootCacheDecision["kind"]): ProcessingStatus {
  switch (decisionKind) {
    case "cache-only": return "verified";
    case "cache-then-reharvest": return "revision-mismatch";
    case "cache-unverified": return "unverified";
    case "harvest-required": return "enriched";
  }
}
