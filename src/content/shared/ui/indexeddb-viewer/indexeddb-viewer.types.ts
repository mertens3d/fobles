// @source-path [fobles] src/content/shared/ui/indexeddb-viewer/indexeddb-viewer.types.ts
export type IndexedDbStoreId = "sitecoreItems" | "sitecoreFacts";
export type CacheRow = { key: string; record: Record<string, unknown>; preview: string; searchText: string };
export type CacheRowsByStore = Record<IndexedDbStoreId, CacheRow[]>;
export type IndexedDbViewerAppProps = { doc: Document };
