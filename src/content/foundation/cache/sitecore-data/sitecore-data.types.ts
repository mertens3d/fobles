import type { ItemKind } from "../../../../shared/structural/structural.types";
import type { LayoutSectionField } from "../../reference-data/model/model.types";
import type { SitecoreHarvestSection } from "../../reference-data/model/model.types";
import type { ItemGraphNodeData } from "../../reference-data/model/model.types";
import type { SitecoreItemLocator, WorkerTaskPayloadByType } from "../../workers/tasks/worker-task.types";

export type PersistedNode = unknown;

export type SitecoreDataCacheKey = {
  environment: string;
  database: string;
  language: string;
  item: SitecoreItemLocator;
};

export type StoredQuickInfo = Omit<ItemGraphNodeData, "facts" | "rawMarkup" | "scTemplate"> & {
  scTemplate: SitecoreItemLocator | undefined;
};

export type SitecoreDataFactMap = {
  templateBases: WorkerTaskPayloadByType["get-template-bases"];
  templateDerived: TemplateDerivedRecord;
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

export type StoredSitecoreDataFactMap = {
  templateBases: SitecoreDataFactMap["templateBases"];
  templateDerived: SitecoreDataFactMap["templateDerived"];
  parent: { parent: SitecoreItemLocator | undefined; hasParent: boolean };
  children: { childItems: readonly SitecoreItemLocator[] };
  referrers: { referrers: readonly SitecoreItemLocator[] };
  customSections: SitecoreDataFactMap["customSections"];
  standardSections: SitecoreDataFactMap["standardSections"];
  layout: SitecoreDataFactMap["layout"];
};

export type SitecoreDataFact<T = unknown> = { value: T; cachedAt: number; lastVerifiedAt?: number };

export type SitecoreDataCacheItemRecord = {
  key: string;
  revision?: string;
  quickInfo?: StoredQuickInfo;
  quickInfoNotFound?: boolean;
  quickInfoCachedAt?: number;
  lastAccessedAt: number;
};

export type SitecoreDataCacheFactRecord<K extends SitecoreStoredFactName = SitecoreStoredFactName> = {
  key: string;
  itemKey: string;
  factName: K;
  fact: SitecoreDataFact<StoredSitecoreDataFactMap[K]>;
};

export type SitecoreDataCacheRecord = SitecoreDataCacheItemRecord & {
  [K in SitecoreStoredFactName]?: SitecoreDataFact<SitecoreDataFactMap[K]>;
};

export type QuickInfoPayload = WorkerTaskPayloadByType["get-quick-info"];

export type SitecoreDataFactValueByName = SitecoreDataFactMap;

export type FactListener = () => void;

export type TemplateDerivedRecord = {
  complete: boolean;
  fingerprint: string;
  inheritedIds: readonly string[];
  kind: ItemKind;
};
