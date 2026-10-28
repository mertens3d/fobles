// @source-path [fobles] src/content/foundation/cache/sitecore-data/sitecore-data-cache.ts

import { FACT_ITEM_KEY_INDEX_NAME, getRequestResult, LAST_ACCESSED_INDEX_NAME, runCacheTransaction } from "./indexed-db.ts";
import { normalizeItemLocator, serializeCacheKey } from "./sitecore-data-cache-key.ts";
import { toPersistedValue } from "./sitecore-data-cache-persistence.ts";
import type {
  SitecoreDataCacheFactRecord,
  SitecoreDataCacheItemRecord,
  SitecoreDataCacheKey,
  SitecoreDataCacheRecord,
  SitecoreDataFact,
  SitecoreDataFactName,
  SitecoreDataFactValueByName,
} from "./sitecore-data-cache.types.ts";

function factKey(itemKey: string, factName: SitecoreDataFactName): string {
  return `${itemKey}::fact::${factName}`;
}

function createItemRecord(key: SitecoreDataCacheKey, now: number): SitecoreDataCacheItemRecord {
  const item = normalizeItemLocator(key.item);

  return {
    key: serializeCacheKey(key),
    database: key.database,
    language: key.language,
    itemKind: item.kind,
    itemValue: item.value,
    lastAccessedAt: now,
  };
}

async function getFactsByItemKey(store: IDBObjectStore, itemKey: string): Promise<SitecoreDataCacheFactRecord[]> {
  return getRequestResult(store.index(FACT_ITEM_KEY_INDEX_NAME).getAll(itemKey)) as Promise<SitecoreDataCacheFactRecord[]>;
}

export async function putFact<K extends SitecoreDataFactName>(
  key: SitecoreDataCacheKey,
  factName: K,
  value: SitecoreDataFactValueByName[K],
  options: { revision?: string; lastVerifiedAt?: number } = {},
): Promise<void> {
  await runCacheTransaction("readwrite", async (itemStore, factStore) => {
    const itemKey = serializeCacheKey(key);
    const now = Date.now();
    const existing = await getRequestResult(itemStore.get(itemKey)) as SitecoreDataCacheItemRecord | undefined;
    const itemRecord = existing ?? createItemRecord(key, now);

    itemRecord.lastAccessedAt = now;
    if (options.revision !== undefined) itemRecord.revision = options.revision;

    await getRequestResult(itemStore.put(itemRecord));

    const fact: SitecoreDataFact<SitecoreDataFactValueByName[K]> = {
      value: toPersistedValue(value, key.environment),
      cachedAt: now,
      ...(options.lastVerifiedAt === undefined ? {} : { lastVerifiedAt: options.lastVerifiedAt }),
    };

    await getRequestResult(factStore.put({
      key: factKey(itemKey, factName),
      itemKey,
      factName,
      fact,
    } satisfies SitecoreDataCacheFactRecord));
  });
}

export async function getFact<K extends SitecoreDataFactName>(
  key: SitecoreDataCacheKey,
  factName: K,
): Promise<SitecoreDataFact<SitecoreDataFactValueByName[K]> | undefined> {
  return runCacheTransaction("readwrite", async (itemStore, factStore) => {
    const itemKey = serializeCacheKey(key);
    const item = await getRequestResult(itemStore.get(itemKey)) as SitecoreDataCacheItemRecord | undefined;

    if (!item) return undefined;

    const record = await getRequestResult(
      factStore.get(factKey(itemKey, factName)),
    ) as SitecoreDataCacheFactRecord<K> | undefined;

    if (!record) return undefined;

    item.lastAccessedAt = Date.now();
    await getRequestResult(itemStore.put(item));

    return record.fact;
  });
}

export async function getItem(key: SitecoreDataCacheKey): Promise<SitecoreDataCacheRecord | undefined> {
  return runCacheTransaction("readonly", async (itemStore, factStore) => {
    const itemKey = serializeCacheKey(key);
    const item = await getRequestResult(itemStore.get(itemKey)) as SitecoreDataCacheItemRecord | undefined;

    if (!item) return undefined;

    const facts = await getFactsByItemKey(factStore, itemKey);
    const record: SitecoreDataCacheRecord = { ...item };

    for (const fact of facts) {
      Object.assign(record, { [fact.factName]: fact.fact });
    }

    return record;
  });
}

export async function deleteItem(key: SitecoreDataCacheKey): Promise<void> {
  await deleteItemByKey(serializeCacheKey(key));
}

async function deleteItemByKey(itemKey: string): Promise<void> {
  await runCacheTransaction("readwrite", async (itemStore, factStore) => {
    const facts = await getFactsByItemKey(factStore, itemKey);

    for (const fact of facts) {
      await getRequestResult(factStore.delete(fact.key));
    }

    await getRequestResult(itemStore.delete(itemKey));
  });
}

export async function clear(): Promise<void> {
  await runCacheTransaction("readwrite", async (itemStore, factStore) => {
    await Promise.all([
      getRequestResult(itemStore.clear()),
      getRequestResult(factStore.clear()),
    ]);
  });
}

export async function count(): Promise<number> {
  return runCacheTransaction("readonly", (itemStore) => getRequestResult(itemStore.count()));
}

export async function evictIfNeeded({ maxItemRecords }: { maxItemRecords: number }): Promise<number> {
  const excess = Math.max(0, (await count()) - maxItemRecords);

  if (excess === 0) return 0;

  const keys = await runCacheTransaction(
    "readonly",
    (itemStore) => getRequestResult(itemStore.index(LAST_ACCESSED_INDEX_NAME).getAllKeys(undefined, excess)),
  ) as IDBValidKey[];

  for (const key of keys) {
    await deleteItemByKey(String(key));
  }

  return keys.length;
}

export async function listItems(
  { sortDirection = "asc" }: { sortDirection?: "asc" | "desc" } = {},
): Promise<SitecoreDataCacheRecord[]> {
  const items = await runCacheTransaction(
    "readonly",
    (itemStore) => getRequestResult(itemStore.index(LAST_ACCESSED_INDEX_NAME).getAll()),
  ) as SitecoreDataCacheItemRecord[];

  if (sortDirection === "desc") items.reverse();

  const records: SitecoreDataCacheRecord[] = [];

  for (const item of items) {
    const record = await runCacheTransaction("readonly", async (_, factStore) => {
      const facts = await getFactsByItemKey(factStore, item.key);
      const merged: SitecoreDataCacheRecord = { ...item };

      for (const fact of facts) {
        Object.assign(merged, { [fact.factName]: fact.fact });
      }

      return merged;
    });

    records.push(record);
  }

  return records;
}