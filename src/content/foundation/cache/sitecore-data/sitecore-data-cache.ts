// @source-path [fobles] src/content/foundation/cache/sitecore-data/sitecore-data-cache.ts
import { getRequestResult, LAST_ACCESSED_INDEX_NAME, runItemStoreTransaction } from "./indexed-db.ts";
import { normalizeIdentityPart, normalizeItemLocator, serializeCacheKey } from "./sitecore-data-cache-key.ts";
import { toPersistedValue } from "./sitecore-data-cache-persistence.ts";
import type {
  CachedValue,
  EvictOptions,
  ListItemsOptions,
  PutFactOptions,
  SitecoreDataCacheKey,
  SitecoreDataCacheRecord,
  SitecoreDataFactMap,
  SitecoreDataFactName,
} from "./sitecore-data-cache.types";
// Conservative default chosen so a long Content Editor session accumulates a bounded amount of
// cached item data without needing byte-size estimation (deferred to a later phase).
export const MAX_ITEM_RECORDS = 2000;
function createEmptyRecord(
  key: SitecoreDataCacheKey,
  serializedKey: string,
  now: number,
): SitecoreDataCacheRecord {
  const item = normalizeItemLocator(key.item);
  return {
    key: serializedKey,
    database: normalizeIdentityPart(key.database),
    language: normalizeIdentityPart(key.language),
    itemKind: item.kind,
    itemValue: item.value,
    lastAccessedAt: now,
  };
}
export async function getItem(key: SitecoreDataCacheKey): Promise<SitecoreDataCacheRecord | undefined> {
  const serializedKey = serializeCacheKey(key);
  const now = Date.now();
  return runItemStoreTransaction("readwrite", async (store) => {
    const request = store.get(serializedKey) as IDBRequest<SitecoreDataCacheRecord | undefined>;
    const existing = await getRequestResult(request);
    if (!existing) return undefined;
    existing.lastAccessedAt = now;
    await getRequestResult(store.put(existing));
    return existing;
  });
}
export async function getFact<TName extends SitecoreDataFactName>(
  key: SitecoreDataCacheKey,
  factName: TName,
): Promise<CachedValue<SitecoreDataFactMap[TName]> | undefined> {
  const record = await getItem(key);
  // TypeScript can't narrow a generic indexed access into a mapped type here - the public
  // signature above keeps every caller's actual type safety intact.
  return record?.[factName] as CachedValue<SitecoreDataFactMap[TName]> | undefined;
}
// AI NOTE: Only the stored copy is stripped (see sitecore-data-cache-persistence.ts). The caller's value keeps its diagnostics.
export async function putFact<TName extends SitecoreDataFactName>(
  key: SitecoreDataCacheKey,
  factName: TName,
  value: SitecoreDataFactMap[TName],
  options?: PutFactOptions,
): Promise<void> {
  const serializedKey = serializeCacheKey(key);
  const now = Date.now();
  await runItemStoreTransaction("readwrite", async (store) => {
    const request = store.get(serializedKey) as IDBRequest<SitecoreDataCacheRecord | undefined>;
    const existing = await getRequestResult(request);
    const record = existing ?? createEmptyRecord(key, serializedKey, now);
    record[factName] = {
      value: toPersistedValue(value, key.environment),
      cachedAt: now,
      lastVerifiedAt: options?.verifiedAt ?? now,
    } as SitecoreDataCacheRecord[TName];
    record.lastAccessedAt = now;
    await getRequestResult(store.put(record));
  });
  await evictIfNeeded();
}
export async function deleteItem(key: SitecoreDataCacheKey): Promise<void> {
  const serializedKey = serializeCacheKey(key);
  await runItemStoreTransaction("readwrite", (store) => getRequestResult(store.delete(serializedKey)));
}
export async function clear(): Promise<void> {
  await runItemStoreTransaction("readwrite", (store) => getRequestResult(store.clear()));
}
export async function count(): Promise<number> {
  return runItemStoreTransaction("readonly", (store) => getRequestResult(store.count()));
}
// Walks the lastAccessedAt index oldest-first inside one transaction, deleting records until the
// store is back at the configured maximum - avoids one transaction per deleted record.
export async function evictIfNeeded(options?: EvictOptions): Promise<number> {
  const maxItemRecords = options?.maxItemRecords ?? MAX_ITEM_RECORDS;
  return runItemStoreTransaction("readwrite", async (store) => {
    const totalCount = await getRequestResult(store.count());
    const excessCount = totalCount - maxItemRecords;
    if (excessCount <= 0) return 0;
    const index = store.index(LAST_ACCESSED_INDEX_NAME);
    let deletedCount = 0;
    await new Promise<void>((resolve, reject) => {
      const cursorRequest = index.openCursor();
      cursorRequest.onsuccess = () => {
        const cursor = cursorRequest.result;
        if (!cursor || deletedCount >= excessCount) {
          resolve();
          return;
        }
        cursor.delete();
        deletedCount += 1;
        cursor.continue();
      };
      cursorRequest.onerror = () => reject(cursorRequest.error ?? new Error("Eviction cursor failed"));
    });
    return deletedCount;
  });
}
// Cache-Inspector-facing enumeration: walks the lastAccessedAt index (ascending by default, so
// the least-recently-used records come first - matching eviction order) and filters in memory,
// per Phase 3B's "don't add new indexes until proven necessary" guidance.
export async function listItems(options?: ListItemsOptions): Promise<SitecoreDataCacheRecord[]> {
  const direction = options?.sortDirection === "desc" ? "prev" : "next";
  const records = await runItemStoreTransaction("readonly", async (store) => {
    const index = store.index(LAST_ACCESSED_INDEX_NAME);
    const results: SitecoreDataCacheRecord[] = [];
    await new Promise<void>((resolve, reject) => {
      const cursorRequest = index.openCursor(undefined, direction);
      cursorRequest.onsuccess = () => {
        const cursor = cursorRequest.result;
        if (!cursor) {
          resolve();
          return;
        }
        results.push(cursor.value as SitecoreDataCacheRecord);
        cursor.continue();
      };
      cursorRequest.onerror = () => reject(cursorRequest.error ?? new Error("listItems cursor failed"));
    });
    return results;
  });
  const database = options?.database !== undefined ? normalizeIdentityPart(options.database) : undefined;
  const language = options?.language !== undefined ? normalizeIdentityPart(options.language) : undefined;
  return records.filter((record) =>
    (database === undefined || record.database === database) &&
    (language === undefined || record.language === language),
  );
}
