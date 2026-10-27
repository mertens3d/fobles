// @source-path [fobles] src/constants/sitecore-data-cache.const.ts
export const SITECORE_DATA_CACHE = {
  // AI NOTE: Diagnostics-only fields. They exist on runtime objects but are never written to IndexedDB (the [JsonIgnore] equivalent).
  NON_PERSISTED_KEYS: ["rawMarkup"],
  // AI NOTE: Properties whose value is an absolute URL on the page's own origin. IndexedDB is origin-scoped, so the host is stored as a relative URL.
  ORIGIN_RELATIVE_KEYS: ["scItemIcon"],
} as const;
