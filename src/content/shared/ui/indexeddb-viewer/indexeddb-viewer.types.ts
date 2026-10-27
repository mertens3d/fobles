// @source-path [fobles] src/content/shared/ui/indexeddb-viewer/indexeddb-viewer.types.ts
import type { SitecoreDataCacheRecord } from "../../../foundation/cache/sitecore-data/sitecore-data-cache.types";

export type CacheRow = {
  key: string;
  record: SitecoreDataCacheRecord;
  preview: string;
  searchText: string;
};

export type IndexedDbViewerAppProps = {
  doc: Document;
};
