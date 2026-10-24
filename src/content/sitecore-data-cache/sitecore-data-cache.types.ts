// @source-path [fobles] src/content/sitecore-data-cache/sitecore-data-cache.types.ts

import type { SitecoreItemLocator, WorkerTaskPayloadByType } from "../sitecore-worker/tasks/worker-task.types";

// One Sitecore item's identity: which Sitecore origin/environment, database, and language it was
// read from, plus how it was located. Two keys differing in any one of these refer to genuinely
// different data and must never share a cache record.
export type SitecoreDataCacheKey = {
  environment: string;
  database: string;
  language: string;
  item: SitecoreItemLocator;
};

export type CachedValue<TValue> = {
  value: TValue;
  cachedAt: number;
  // When this value was last confirmed live against Sitecore - distinct from cachedAt so a
  // future live-data manager can tell "freshly written" apart from "written long ago but
  // re-verified recently" without this module needing to know what "stale" means.
  lastVerifiedAt: number;
};

// Reuses the Phase 2 worker payload shapes directly (including get-quick-info's found/not-found/
// error semantics) rather than re-declaring equivalent result interfaces.
export type QuickInfoPayload = WorkerTaskPayloadByType["get-quick-info"];
export type ParentPayload = WorkerTaskPayloadByType["get-parent"];
export type ChildrenPayload = WorkerTaskPayloadByType["get-children"];
export type ReferrersPayload = WorkerTaskPayloadByType["get-referrers"];
export type CustomFieldsPayload = WorkerTaskPayloadByType["get-custom-fields"];
export type StandardFieldsPayload = WorkerTaskPayloadByType["get-standard-fields"];
export type LayoutPayload = WorkerTaskPayloadByType["get-layout"];

export type SitecoreDataFactMap = {
  quickInfo: QuickInfoPayload;
  parent: ParentPayload;
  children: ChildrenPayload;
  referrers: ReferrersPayload;
  customSections: CustomFieldsPayload;
  standardSections: StandardFieldsPayload;
  layout: LayoutPayload;
};

export type SitecoreDataFactName = keyof SitecoreDataFactMap;

// Distributing over SitecoreDataFactName keeps each fact's CachedValue tied to its own payload
// type, so getFact/putFact stay fully typed per fact name with no `any`/cast required.
export type SitecoreDataCacheFacts = {
  [TName in SitecoreDataFactName]?: CachedValue<SitecoreDataFactMap[TName]>;
};

export type SitecoreDataCacheRecord = {
  key: string;
  environment: string;
  database: string;
  language: string;
  itemKind: SitecoreItemLocator["kind"];
  itemValue: string;
  lastAccessedAt: number;
} & SitecoreDataCacheFacts;

export type PutFactOptions = {
  // Timestamp the value was last confirmed live; omit for a write that is itself the
  // verification (lastVerifiedAt defaults to the same "now" as cachedAt).
  verifiedAt?: number;
};

export type EvictOptions = {
  maxItemRecords?: number;
};

// Minimum surface a future Cache Inspector needs: enumerate + filter by identity + order by
// recency. Payload text search and per-fact verification-time sorting are deliberately deferred.
export type ListItemsOptions = {
  environment?: string;
  database?: string;
  language?: string;
  sortDirection?: "asc" | "desc";
};
