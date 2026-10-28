// @source-path [fobles] src/content/shared/ui/indexeddb-viewer/indexeddb-viewer-service.ts
import { clear } from "../../../foundation/cache/sitecore-data/sitecore-data-cache";
import { getRequestResult, runCacheTransaction } from "../../../foundation/cache/sitecore-data/indexed-db";
import { previewJson } from "../json-tree/json-tree-preview";
import type { CacheRow, CacheRowsByStore } from "./indexeddb-viewer.types";
function toRow(record: Record<string, unknown>): CacheRow {
  const key = String(record.key ?? "");
  const { key: _, ...value } = record;
  return { key, record, preview: previewJson(value), searchText: JSON.stringify(record).toLowerCase() };
}
export async function loadCacheRows(): Promise<CacheRowsByStore> {
  return runCacheTransaction("readonly", async (itemStore, factStore) => {
    const [items, facts] = await Promise.all([getRequestResult(itemStore.getAll()), getRequestResult(factStore.getAll())]);
    return { sitecoreItems: (items as Record<string, unknown>[]).map(toRow), sitecoreFacts: (facts as Record<string, unknown>[]).map(toRow) };
  });
}
export function filterCacheRows(rows: readonly CacheRow[], query: string): CacheRow[] {
  const needle = query.trim().toLowerCase();
  return needle ? rows.filter((row) => row.searchText.includes(needle)) : [...rows];
}
export async function clearSitecoreDataCache(): Promise<void> { await clear(); }
