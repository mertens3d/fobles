// @source-path [fobles] src/content/foundation/cache/sitecore-data/sitecore-data-cache.types.ts
import type { ItemGraphNodeData, LayoutSectionField, SitecoreHarvestSection } from "../../reference-data/model/sitecore-item.types";
import type { SitecoreItemLocator, SitecoreResolvedResult } from "../../workers/tasks/worker-task.types";
export type SitecoreDataCacheKey = { environment: string; database: string; language: string; item: SitecoreItemLocator };
export type SitecoreDataFactMap = {
  quickInfo: { result: SitecoreResolvedResult<ItemGraphNodeData>; revision?: string };
  parent: { parent: ItemGraphNodeData | undefined };
  children: { childItems: readonly ItemGraphNodeData[] };
  referrers: { referrers: readonly ItemGraphNodeData[] };
  customSections: { sections: readonly SitecoreHarvestSection[] };
  standardSections: { sections: readonly SitecoreHarvestSection[] };
  layout: { layoutSectionFields: readonly LayoutSectionField[] };
};
export type SitecoreDataFactName = keyof SitecoreDataFactMap;
export type SitecoreDataFact<T = unknown> = { value: T; cachedAt: number; lastVerifiedAt?: number };
export type SitecoreDataCacheItemRecord = { key: string; database: string; language: string; itemKind: SitecoreItemLocator["kind"]; itemValue: string; revision?: string; lastAccessedAt: number };
export type SitecoreDataCacheFactRecord<K extends SitecoreDataFactName = SitecoreDataFactName> = { key: string; itemKey: string; factName: K; fact: SitecoreDataFact<SitecoreDataFactMap[K]> };
export type SitecoreDataCacheRecord = SitecoreDataCacheItemRecord & { [K in SitecoreDataFactName]?: SitecoreDataFact<SitecoreDataFactMap[K]> };
export type QuickInfoPayload = SitecoreDataFactMap["quickInfo"];
export type SitecoreDataFactValueByName = SitecoreDataFactMap;
