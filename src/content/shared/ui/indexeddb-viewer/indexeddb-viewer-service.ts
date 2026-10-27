// @source-path [fobles] src/content/shared/ui/indexeddb-viewer/indexeddb-viewer-service.ts
import { clear, listItems } from "../../../foundation/cache/sitecore-data/sitecore-data-cache";
import type { SitecoreDataCacheRecord } from "../../../foundation/cache/sitecore-data/sitecore-data-cache.types";
import { previewJson } from "../json-tree/json-tree-preview";
import type { CacheRow } from "./indexeddb-viewer.types";

function toRow(record: SitecoreDataCacheRecord): CacheRow {
  const { key, ...value } = record;
  return { key, record, preview: previewJson(value), searchText: JSON.stringify(record).toLowerCase() };
}

export async function loadCacheRows(): Promise<CacheRow[]> {
  const records = await listItems({ sortDirection: "desc" });
  return records.map(toRow);
}

export function filterCacheRows(rows: readonly CacheRow[], query: string): CacheRow[] {
  const needle = query.trim().toLowerCase();
  return needle ? rows.filter((row) => row.searchText.includes(needle)) : [...rows];
}

export async function clearSitecoreDataCache(): Promise<void> {
  await clear();
}
