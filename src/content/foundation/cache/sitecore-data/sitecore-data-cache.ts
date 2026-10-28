// @source-path [fobles] src/content/foundation/cache/sitecore-data/sitecore-data-cache.ts

import type { ItemGraphNodeData } from "../../reference-data/model/sitecore-item.types";
import type { SitecoreItemLocator } from "../../workers/tasks/worker-task.types";
import { FACT_ITEM_KEY_INDEX_NAME, getRequestResult, LAST_ACCESSED_INDEX_NAME, runCacheTransaction } from "./indexed-db.ts";
import { serializeCacheKey } from "./sitecore-data-cache-key.ts";
import { toPersistedValue } from "./sitecore-data-cache-persistence.ts";
import type {
  SitecoreDataCacheFactRecord,
  SitecoreDataCacheItemRecord,
  SitecoreDataCacheKey,
  SitecoreDataCacheRecord,
  SitecoreDataFact,
  SitecoreDataFactMap,
  SitecoreDataFactName,
  SitecoreDataFactValueByName,
  SitecoreStoredFactName,
  StoredQuickInfo,
  StoredSitecoreDataFactMap,
} from "./sitecore-data-cache.types.ts";

function factKey(itemKey: string, factName: SitecoreStoredFactName): string {
  return `${itemKey}::fact::${factName}`;
}

function createItemRecord(key: SitecoreDataCacheKey, now: number): SitecoreDataCacheItemRecord {
  return {
    key: serializeCacheKey(key),
    lastAccessedAt: now,
  };
}

async function getFactsByItemKey(store: IDBObjectStore, itemKey: string): Promise<SitecoreDataCacheFactRecord[]> {
  return getRequestResult(store.index(FACT_ITEM_KEY_INDEX_NAME).getAll(itemKey)) as Promise<SitecoreDataCacheFactRecord[]>;
}

function stripQuickInfo(item: ItemGraphNodeData | undefined): StoredQuickInfo | undefined {
  if (!item) return undefined;

  const {
    facts: _facts,
    rawMarkup: _rawMarkup,
    scTemplate,
    ...quickInfo
  } = item;

  if (!scTemplate) {
    return {
      ...quickInfo,
      scTemplate: undefined,
    };
  }

  const {
    facts: _templateFacts,
    rawMarkup: _templateRawMarkup,
    scTemplate: _nestedTemplate,
    ...template
  } = scTemplate;

  return {
    ...quickInfo,
    scTemplate: template,
  };
}

function toLocator(item: ItemGraphNodeData | undefined): SitecoreItemLocator | undefined {
  const itemId = item?.scItemId?.replace(/[{}]/g, "").trim();

  if (itemId) return { kind: "id", value: itemId };

  const itemPath = item?.scItemPath?.trim();

  return itemPath ? { kind: "path", value: itemPath } : undefined;
}

function fromLocator(locator: SitecoreItemLocator): ItemGraphNodeData {
  return {
    type: "scItem",
    scItemName: undefined,
    scItemId: locator.kind === "id" ? locator.value : undefined,
    link: undefined,
    scItemPath: locator.kind === "path" ? locator.value : undefined,
    scTemplate: undefined,
    scItemIcon: undefined,
    rawMarkup: undefined,
    facts: {},
  };
}

function storeFactValue<K extends SitecoreStoredFactName>(
  factName: K,
  value: SitecoreDataFactMap[K],
): StoredSitecoreDataFactMap[K] {
  if (factName === "parent") {
    const parent = (value as SitecoreDataFactMap["parent"]).parent;

    return {
      parent: toLocator(parent),
    } as unknown as StoredSitecoreDataFactMap[K];
  }

  if (factName === "children") {
    const childItems = (value as SitecoreDataFactMap["children"]).childItems
      .map(toLocator)
      .filter((item): item is SitecoreItemLocator => item !== undefined);

    return {
      childItems,
    } as unknown as StoredSitecoreDataFactMap[K];
  }

  if (factName === "referrers") {
    const referrers = (value as SitecoreDataFactMap["referrers"]).referrers
      .map(toLocator)
      .filter((item): item is SitecoreItemLocator => item !== undefined);

    return {
      referrers,
    } as unknown as StoredSitecoreDataFactMap[K];
  }

  return value as unknown as StoredSitecoreDataFactMap[K];
}

function restoreFactValue<K extends SitecoreStoredFactName>(
  factName: K,
  value: StoredSitecoreDataFactMap[K],
): SitecoreDataFactMap[K] {
  if (factName === "parent") {
    const parent = (value as StoredSitecoreDataFactMap["parent"]).parent;

    return {
      parent: parent ? fromLocator(parent) : undefined,
    } as unknown as SitecoreDataFactMap[K];
  }

  if (factName === "children") {
    const childItems = (value as StoredSitecoreDataFactMap["children"]).childItems.map(fromLocator);

    return {
      childItems,
    } as unknown as SitecoreDataFactMap[K];
  }

  if (factName === "referrers") {
    const referrers = (value as StoredSitecoreDataFactMap["referrers"]).referrers.map(fromLocator);

    return {
      referrers,
    } as unknown as SitecoreDataFactMap[K];
  }

  return value as unknown as SitecoreDataFactMap[K];
}

function restoreFact<K extends SitecoreStoredFactName>(
  record: SitecoreDataCacheFactRecord<K>,
): SitecoreDataFact<SitecoreDataFactMap[K]> {
  return {
    ...record.fact,
    value: restoreFactValue(record.factName, record.fact.value),
  };
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

    if (options.revision !== undefined) {
      itemRecord.revision = options.revision;
    }

    if (factName === "quickInfo") {
      const quickInfo = value as SitecoreDataFactMap["quickInfo"];

      itemRecord.quickInfo = quickInfo.result.status === "found"
        ? toPersistedValue(stripQuickInfo(quickInfo.result.value), key.environment)
        : undefined;

      await getRequestResult(itemStore.put(itemRecord));

      return;
    }

    await getRequestResult(itemStore.put(itemRecord));

    const storedFactName = factName as SitecoreStoredFactName;
    const storedValue = storeFactValue(
      storedFactName,
      value as SitecoreDataFactMap[SitecoreStoredFactName],
    );

    const fact: SitecoreDataCacheFactRecord["fact"] = {
      value: toPersistedValue(storedValue, key.environment),
      cachedAt: now,
      ...(options.lastVerifiedAt === undefined
        ? {}
        : { lastVerifiedAt: options.lastVerifiedAt }),
    };

    await getRequestResult(factStore.put({
      key: factKey(itemKey, storedFactName),
      itemKey,
      factName: storedFactName,
      fact,
    }));
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

    item.lastAccessedAt = Date.now();

    await getRequestResult(itemStore.put(item));

    if (factName === "quickInfo") {
      if (!item.quickInfo) return undefined;

      const scTemplate = item.quickInfo.scTemplate
        ? {
            ...item.quickInfo.scTemplate,
            scTemplate: undefined,
            rawMarkup: undefined,
            facts: {},
          }
        : undefined;

      const runtimeItem: ItemGraphNodeData = {
        ...item.quickInfo,
        scTemplate,
        rawMarkup: undefined,
        facts: {},
      };

      const value = {
        result: {
          requested: key.item,
          resolved: {
            itemId: runtimeItem.scItemId ?? "",
            path: runtimeItem.scItemPath,
          },
          value: runtimeItem,
          status: "found" as const,
        },
      };

      return {
        value,
        cachedAt: item.lastAccessedAt,
      } as SitecoreDataFact<SitecoreDataFactValueByName[K]>;
    }

    const storedFactName = factName as SitecoreStoredFactName;
    const record = await getRequestResult(
      factStore.get(factKey(itemKey, storedFactName)),
    ) as SitecoreDataCacheFactRecord | undefined;

    return record
      ? restoreFact(record) as SitecoreDataFact<SitecoreDataFactValueByName[K]>
      : undefined;
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
      Object.assign(record, {
        [fact.factName]: restoreFact(fact),
      });
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
  );

  for (const key of keys) {
    if (typeof key === "string" || typeof key === "number") {
      await deleteItemByKey(String(key));
    }
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

  if (sortDirection === "desc") {
    items.reverse();
  }

  const records: SitecoreDataCacheRecord[] = [];

  for (const item of items) {
    const record = await runCacheTransaction("readonly", async (_, factStore) => {
      const facts = await getFactsByItemKey(factStore, item.key);
      const merged: SitecoreDataCacheRecord = { ...item };

      for (const fact of facts) {
        Object.assign(merged, {
          [fact.factName]: restoreFact(fact),
        });
      }

      return merged;
    });

    records.push(record);
  }

  return records;
}