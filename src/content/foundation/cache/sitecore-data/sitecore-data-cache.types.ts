// @source-path [fobles] src/content/foundation/cache/sitecore-data/sitecore-data-cache.types.ts

import type { ItemGraphNodeData, LayoutSectionField, SitecoreHarvestSection } from "../../reference-data/model/sitecore-item.types";
import type { SitecoreItemLocator, WorkerTaskPayloadByType } from "../../workers/tasks/worker-task.types";

export type SitecoreDataCacheKey = { environment: string; database: string; language: string; item: SitecoreItemLocator };
export type StoredQuickInfo = Omit<ItemGraphNodeData, "facts" | "rawMarkup" | "scTemplate"> & { scTemplate: Omit<NonNullable<ItemGraphNodeData["scTemplate"]>, "facts"> | undefined };
export type SitecoreDataFactMap = {
  quickInfo: { result: WorkerTaskPayloadByType["get-quick-info"]["result"] };
  parent: { parent: ItemGraphNodeData | undefined };
  children: { childItems: readonly ItemGraphNodeData[] };
  referrers: { referrers: readonly ItemGraphNodeData[] };
  customSections: { sections: readonly SitecoreHarvestSection[] };
  standardSections: { sections: readonly SitecoreHarvestSection[] };
  layout: { layoutSectionFields: readonly LayoutSectionField[] };
};
export type SitecoreDataFactName = keyof SitecoreDataFactMap;
export type SitecoreStoredFactName = Exclude<SitecoreDataFactName, "quickInfo">;
export type SitecoreDataFact<T = unknown> = { value: T; cachedAt: number; lastVerifiedAt?: number };
export type SitecoreDataCacheItemRecord = { key: string; revision?: string; quickInfo?: StoredQuickInfo; lastAccessedAt: number };
export type SitecoreDataCacheFactRecord<K extends SitecoreStoredFactName = SitecoreStoredFactName> = {
  key: string;
  itemKey: string;
  factName: K;
  fact: SitecoreDataFact<SitecoreDataFactMap[K]>;
};
export type SitecoreDataCacheRecord = SitecoreDataCacheItemRecord & {
  [K in SitecoreStoredFactName]?: SitecoreDataFact<SitecoreDataFactMap[K]>;
};
export type QuickInfoPayload = WorkerTaskPayloadByType["get-quick-info"];
export type SitecoreDataFactValueByName = SitecoreDataFactMap;
