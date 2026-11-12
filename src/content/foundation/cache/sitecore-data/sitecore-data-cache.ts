// @source-path [Fobles] src/content/foundation/cache/sitecore-data/sitecore-data-cache.ts

import type { ItemGraphNodeData } from "../../reference-data/model/model.types";
import type { SitecoreItemLocator } from "../../workers/tasks/worker-task.types";
import {
  FACT_ITEM_KEY_INDEX_NAME,
  getRequestResult,
  LAST_ACCESSED_INDEX_NAME,
  runCacheTransaction,
} from "./indexed-db.ts";
import { serializeCacheKey } from "./sitecore-data-cache-key.ts";
import { toPersistedValue } from "./sitecore-data-cache-persistence.ts";
import { publishFactUpdated } from "./sitecore-data-events.ts";
import type { SitecoreDataFactValueByName } from "./sitecore-data.types";
import type { SitecoreDataCacheRecord } from "./sitecore-data.types";
import type { SitecoreDataCacheFactRecord } from "./sitecore-data.types";
import type { SitecoreDataCacheItemRecord } from "./sitecore-data.types";
import type { SitecoreDataFact } from "./sitecore-data.types";
import type { StoredSitecoreDataFactMap } from "./sitecore-data.types";
import type { SitecoreStoredFactName } from "./sitecore-data.types";
import type { SitecoreDataFactName } from "./sitecore-data.types";
import type { SitecoreDataFactMap } from "./sitecore-data.types";
import type { StoredQuickInfo } from "./sitecore-data.types";
import type { SitecoreDataCacheKey } from "./sitecore-data.types";

function requireStoredFactName(
  factName: SitecoreDataFactName,
): SitecoreStoredFactName {
  if (factName === "quickInfo") {
    throw new Error("quickInfo is stored on the item record.");
  }

  return factName;
}

function factKey(itemKey: string, factName: SitecoreStoredFactName): string {
  return `${itemKey}::fact::${factName}`;
}

function createItemRecord(key: SitecoreDataCacheKey, now: number): SitecoreDataCacheItemRecord {
  return { key: serializeCacheKey(key), lastAccessedAt: now };
}

async function getFactsByItemKey(store: IDBObjectStore, itemKey: string): Promise<SitecoreDataCacheFactRecord[]> {
  return getRequestResult(store.index(FACT_ITEM_KEY_INDEX_NAME).getAll(itemKey)) as Promise<
    SitecoreDataCacheFactRecord[]
  >;
}

function toLocator(item: ItemGraphNodeData | undefined): SitecoreItemLocator | undefined {
  const id = item?.scItemId?.replace(/[{}]/g, "").trim();
  if (id) {
    return { kind: "id", value: id };
  }
  const path = item?.scItemPath?.trim();
  return path ? { kind: "path", value: path } : undefined;
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

function stripQuickInfo(item: ItemGraphNodeData | undefined): StoredQuickInfo | undefined {
  if (!item) {
    return undefined;
  }
  const { facts: _facts, rawMarkup: _rawMarkup, scTemplate, ...quickInfo } = item;
  return { ...quickInfo, scTemplate: toLocator(scTemplate) };
}

function restoreQuickInfo(item: StoredQuickInfo): ItemGraphNodeData {
  return {
    ...item,
    scTemplate: item.scTemplate ? fromLocator(item.scTemplate) : undefined,
    rawMarkup: undefined,
    facts: {},
  };
}

function storeFactValue<K extends SitecoreStoredFactName>(
  factName: K,
  value: SitecoreDataFactMap[K],
): StoredSitecoreDataFactMap[K] {
  if (factName === "parent") {
    const parent = toLocator((value as SitecoreDataFactMap["parent"]).parent);
    return {
      parent,
      hasParent: parent !== undefined,
    } as unknown as StoredSitecoreDataFactMap[K];
  }
  if (factName === "children") {
    const childItems = (value as SitecoreDataFactMap["children"]).childItems
      .map(toLocator)
      .filter((item): item is SitecoreItemLocator => item !== undefined);
    return { childItems } as unknown as StoredSitecoreDataFactMap[K];
  }
  if (factName === "referrers") {
    const referrers = (value as SitecoreDataFactMap["referrers"]).referrers
      .map(toLocator)
      .filter((item): item is SitecoreItemLocator => item !== undefined);
    return { referrers } as unknown as StoredSitecoreDataFactMap[K];
  }
  return value as unknown as StoredSitecoreDataFactMap[K];
}

function restoreFactValue<K extends SitecoreStoredFactName>(
  factName: K,
  value: StoredSitecoreDataFactMap[K],
): SitecoreDataFactMap[K] {
  if (factName === "parent") {
    const stored = value as StoredSitecoreDataFactMap["parent"] | undefined;
    const parent = stored?.parent;
    return { parent: parent ? fromLocator(parent) : undefined } as unknown as SitecoreDataFactMap[K];
  }
  if (factName === "children") {
    return {
      childItems: (value as StoredSitecoreDataFactMap["children"]).childItems.map(fromLocator),
    } as unknown as SitecoreDataFactMap[K];
  }
  if (factName === "referrers") {
    return {
      referrers: (value as StoredSitecoreDataFactMap["referrers"]).referrers.map(fromLocator),
    } as unknown as SitecoreDataFactMap[K];
  }
  return value as unknown as SitecoreDataFactMap[K];
}

function restoreFact<K extends SitecoreStoredFactName>(
  record: SitecoreDataCacheFactRecord<K>,
): SitecoreDataFact<SitecoreDataFactMap[K]> {
  return { ...record.fact, value: restoreFactValue(record.factName, record.fact.value) };
}

export async function putFact<K extends SitecoreDataFactName>(
  key: SitecoreDataCacheKey,
  factName: K,
  value: SitecoreDataFactValueByName[K],
  options: { revision?: string; lastVerifiedAt?: number } = {},
): Promise<void> {
  if (factName === "templateBases" && (value as SitecoreDataFactMap["templateBases"]).inheritedTemplateIds === undefined) {
    throw new TypeError("Unavailable template inheritance cannot be cached");
  }
  await runCacheTransaction("readwrite", async (itemStore, factStore) => {
    const itemKey = serializeCacheKey(key);
    const now = Date.now();
    const itemRecord =
      ((await getRequestResult(itemStore.get(itemKey))) as SitecoreDataCacheItemRecord | undefined) ??
      createItemRecord(key, now);
    itemRecord.lastAccessedAt = now;
    if (options.revision !== undefined) {
      itemRecord.revision = options.revision;
    }
    if (factName === "quickInfo") {
      itemRecord.quickInfoCachedAt = now;
      const quickInfo = value as SitecoreDataFactMap["quickInfo"];
      if (quickInfo.result.status === "found" && quickInfo.result.value) {
        itemRecord.quickInfo = toPersistedValue(stripQuickInfo(quickInfo.result.value), key.environment);
        delete itemRecord.quickInfoNotFound;
      } else if (quickInfo.result.status === "not-found") {
        delete itemRecord.quickInfo;
        itemRecord.quickInfoNotFound = true;
      } else {
        delete itemRecord.quickInfo;
        delete itemRecord.quickInfoNotFound;
      }
      await getRequestResult(itemStore.put(itemRecord));
      return;
    }
    await getRequestResult(itemStore.put(itemRecord));
    const storedFactName = requireStoredFactName(factName);
    const storedValue = storeFactValue(storedFactName, value as SitecoreDataFactMap[SitecoreStoredFactName]);
    const fact: SitecoreDataCacheFactRecord["fact"] = {
      value: toPersistedValue(storedValue, key.environment),
      cachedAt: now,
      ...(options.lastVerifiedAt === undefined ? {} : { lastVerifiedAt: options.lastVerifiedAt }),
    };
    await getRequestResult(
      factStore.put({ key: factKey(itemKey, storedFactName), itemKey, factName: storedFactName, fact }),
    );
  });
  publishFactUpdated(key, factName);

}

export async function getCachedFact<K extends SitecoreDataFactName>(
  key: SitecoreDataCacheKey,
  factName: K,
): Promise<SitecoreDataFact<SitecoreDataFactValueByName[K]> | undefined> {
  return runCacheTransaction("readwrite", async (itemStore, factStore) => {
    const itemKey = serializeCacheKey(key);
    const item = (await getRequestResult(itemStore.get(itemKey))) as SitecoreDataCacheItemRecord | undefined;
    if (!item) {
      return undefined;
    }
    item.lastAccessedAt = Date.now();
    await getRequestResult(itemStore.put(item));
    if (factName === "quickInfo") {
      if (item.quickInfoNotFound) {
        return {
          value: { result: { requested: key.item, status: "not-found" } },
          cachedAt: item.quickInfoCachedAt ?? 0,
        } as SitecoreDataFact<SitecoreDataFactValueByName[K]>;
      }
      if (!item.quickInfo) {
        return undefined;
      }
      const runtimeItem = restoreQuickInfo(item.quickInfo);
      const value = {
        result: {
          requested: key.item,
          resolved: { itemId: runtimeItem.scItemId ?? "", path: runtimeItem.scItemPath },
          value: runtimeItem,
          status: "found" as const,
        },
      };
      return { value, cachedAt: item.quickInfoCachedAt ?? 0 } as SitecoreDataFact<SitecoreDataFactValueByName[K]>;
    }
    const storedFactName = requireStoredFactName(factName);
    const record = (await getRequestResult(factStore.get(factKey(itemKey, storedFactName)))) as
      SitecoreDataCacheFactRecord | undefined;
    return record ? (restoreFact(record) as SitecoreDataFact<SitecoreDataFactValueByName[K]>) : undefined;
  });
}

export async function getItem(key: SitecoreDataCacheKey): Promise<SitecoreDataCacheRecord | undefined> {
  return runCacheTransaction("readonly", async (itemStore, factStore) => {
    const itemKey = serializeCacheKey(key);
    const item = (await getRequestResult(itemStore.get(itemKey))) as SitecoreDataCacheItemRecord | undefined;
    if (!item) {
      return undefined;
    }
    const record: SitecoreDataCacheRecord = { ...item };
    for (const fact of await getFactsByItemKey(factStore, itemKey)) {
      Object.assign(record, { [fact.factName]: restoreFact(fact) });
    }
    return record;
  });
}

export async function deleteItem(key: SitecoreDataCacheKey): Promise<void> {
  await deleteItemByKey(serializeCacheKey(key));
}

async function deleteItemByKey(itemKey: string): Promise<void> {
  await runCacheTransaction("readwrite", async (itemStore, factStore) => {
    for (const fact of await getFactsByItemKey(factStore, itemKey)) {
      await getRequestResult(factStore.delete(fact.key));
    }
    await getRequestResult(itemStore.delete(itemKey));
  });
}

export async function clear(): Promise<void> {
  await runCacheTransaction("readwrite", async (itemStore, factStore) => {
    await Promise.all([getRequestResult(itemStore.clear()), getRequestResult(factStore.clear())]);
  });
}

export async function count(): Promise<number> {
  return runCacheTransaction("readonly", (itemStore) => getRequestResult(itemStore.count()));
}

export async function evictIfNeeded({ maxItemRecords }: { maxItemRecords: number }): Promise<number> {
  const excess = Math.max(0, (await count()) - maxItemRecords);
  if (excess === 0) {
    return 0;
  }
  const keys = await runCacheTransaction("readonly", (itemStore) =>
    getRequestResult(itemStore.index(LAST_ACCESSED_INDEX_NAME).getAllKeys(undefined, excess)),
  );
  for (const key of keys) {
    if (typeof key === "string" || typeof key === "number") {
      await deleteItemByKey(String(key));
    }
  }
  return keys.length;
}

export async function listItems({ sortDirection = "asc" }: { sortDirection?: "asc" | "desc" } = {}): Promise<
  SitecoreDataCacheRecord[]
> {
  const items = (await runCacheTransaction("readonly", (itemStore) =>
    getRequestResult(itemStore.index(LAST_ACCESSED_INDEX_NAME).getAll()),
  )) as SitecoreDataCacheItemRecord[];
  if (sortDirection === "desc") {
    items.reverse();
  }
  const records: SitecoreDataCacheRecord[] = [];
  for (const item of items) {
    const record = await runCacheTransaction("readonly", async (_, factStore) => {
      const merged: SitecoreDataCacheRecord = { ...item };
      for (const fact of await getFactsByItemKey(factStore, item.key)) {
        Object.assign(merged, { [fact.factName]: restoreFact(fact) });
      }
      return merged;
    });
    records.push(record);
  }
  return records;
}
