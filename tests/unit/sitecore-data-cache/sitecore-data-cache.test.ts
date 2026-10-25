// @source-path [fobles] tests/unit/sitecore-data-cache/sitecore-data-cache.test.ts

import "fake-indexeddb/auto";
import { beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import {
  DATABASE_NAME,
  getRequestResult,
  resetDatabaseConnectionForTests,
  runItemStoreTransaction,
} from "../../../src/content/foundation/cache/sitecore-data/indexed-db.ts";
import { serializeCacheKey } from "../../../src/content/foundation/cache/sitecore-data/sitecore-data-cache-key.ts";
import {
  clear,
  count,
  deleteItem,
  evictIfNeeded,
  getFact,
  getItem,
  putFact,
} from "../../../src/content/foundation/cache/sitecore-data/sitecore-data-cache.ts";
import type {
  QuickInfoPayload,
  SitecoreDataCacheKey,
  SitecoreDataCacheRecord,
} from "../../../src/content/foundation/cache/sitecore-data/sitecore-data-cache.types";

function sampleKey(overrides: Partial<SitecoreDataCacheKey> = {}): SitecoreDataCacheKey {
  return {
    environment: "DEV",
    database: "master",
    language: "en",
    item: { kind: "id", value: "46004574-866d-4702-828e-1c95ad1e03aa" },
    ...overrides,
  };
}

function guidFor(index: number): string {
  return `aaaaaaaa-aaaa-aaaa-aaaa-${String(index).padStart(12, "0")}`;
}

async function peekRecord(key: SitecoreDataCacheKey): Promise<SitecoreDataCacheRecord | undefined> {
  return runItemStoreTransaction("readonly", (store) => {
    const request = store.get(serializeCacheKey(key)) as IDBRequest<SitecoreDataCacheRecord | undefined>;
    return getRequestResult(request);
  });
}

async function setLastAccessedAt(key: SitecoreDataCacheKey, lastAccessedAt: number): Promise<void> {
  await runItemStoreTransaction("readwrite", async (store) => {
    const request = store.get(serializeCacheKey(key)) as IDBRequest<SitecoreDataCacheRecord>;
    const existing = await getRequestResult(request);
    existing.lastAccessedAt = lastAccessedAt;
    await getRequestResult(store.put(existing));
  });
}

void beforeEach(async () => {
  resetDatabaseConnectionForTests();

  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DATABASE_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error("Failed to reset test database"));
  });
});

void test("putFact creates a record", async () => {
  const key = sampleKey();
  await putFact(key, "parent", { parent: undefined });

  const record = await getItem(key);
  assert.ok(record);
  assert.ok(record?.parent);
});

void test("a second putFact preserves the first fact", async () => {
  const key = sampleKey();
  await putFact(key, "parent", { parent: undefined });
  await putFact(key, "children", { childItems: [] });

  const record = await getItem(key);
  assert.ok(record?.parent);
  assert.ok(record?.children);
});

void test("getFact returns the correct typed fact", async () => {
  const key = sampleKey();
  await putFact(key, "referrers", { referrers: [] });

  const fact = await getFact(key, "referrers");
  assert.ok(fact);
  assert.deepEqual(fact?.value, { referrers: [] });
});

void test("getFact updates lastAccessedAt", async () => {
  const key = sampleKey();
  await putFact(key, "parent", { parent: undefined });
  await setLastAccessedAt(key, 1);

  await getFact(key, "parent");

  const record = await peekRecord(key);
  assert.ok(record);
  assert.ok(record && record.lastAccessedAt > 1);
});

void test("cached not-found remains distinguishable from a cache miss", async () => {
  const key = sampleKey();
  const notFoundPayload: QuickInfoPayload = {
    result: { requested: key.item, status: "not-found" },
  };

  await putFact(key, "quickInfo", notFoundPayload);
  const cachedNotFound = await getFact(key, "quickInfo");
  assert.equal(cachedNotFound?.value.result.status, "not-found");

  const missingKey = sampleKey({ item: { kind: "id", value: guidFor(999) } });
  const miss = await getFact(missingKey, "quickInfo");
  assert.equal(miss, undefined);
});

void test("deleteItem removes one record", async () => {
  const keyA = sampleKey({ item: { kind: "id", value: guidFor(1) } });
  const keyB = sampleKey({ item: { kind: "id", value: guidFor(2) } });
  await putFact(keyA, "parent", { parent: undefined });
  await putFact(keyB, "parent", { parent: undefined });

  await deleteItem(keyA);

  assert.equal(await getItem(keyA), undefined);
  assert.ok(await getItem(keyB));
});

void test("clear removes all records", async () => {
  await putFact(sampleKey({ item: { kind: "id", value: guidFor(1) } }), "parent", { parent: undefined });
  await putFact(sampleKey({ item: { kind: "id", value: guidFor(2) } }), "parent", { parent: undefined });

  await clear();

  assert.equal(await count(), 0);
});

void test("LRU deletes the oldest-accessed records first", async () => {
  const keys = Array.from({ length: 5 }, (_, index) => sampleKey({ item: { kind: "id", value: guidFor(index) } }));

  for (const [index, key] of keys.entries()) {
    await putFact(key, "parent", { parent: undefined });
    await setLastAccessedAt(key, index + 1);
  }

  const deletedCount = await evictIfNeeded({ maxItemRecords: 3 });
  assert.equal(deletedCount, 2);

  assert.equal(await peekRecord(keys[0]), undefined);
  assert.equal(await peekRecord(keys[1]), undefined);
  assert.ok(await peekRecord(keys[2]));
  assert.ok(await peekRecord(keys[3]));
  assert.ok(await peekRecord(keys[4]));
});

void test("LRU stops exactly at the configured maximum", async () => {
  const keys = Array.from({ length: 5 }, (_, index) => sampleKey({ item: { kind: "id", value: guidFor(index) } }));

  for (const [index, key] of keys.entries()) {
    await putFact(key, "parent", { parent: undefined });
    await setLastAccessedAt(key, index + 1);
  }

  await evictIfNeeded({ maxItemRecords: 3 });
  assert.equal(await count(), 3);

  const secondEvictionCount = await evictIfNeeded({ maxItemRecords: 3 });
  assert.equal(secondEvictionCount, 0);
  assert.equal(await count(), 3);
});

void test("concurrent writes of different facts do not lose data", async () => {
  const key = sampleKey();

  await Promise.all([
    putFact(key, "parent", { parent: undefined }),
    putFact(key, "children", { childItems: [] }),
    putFact(key, "referrers", { referrers: [] }),
  ]);

  const record = await getItem(key);
  assert.ok(record?.parent);
  assert.ok(record?.children);
  assert.ok(record?.referrers);
});

void test("IndexedDB failure rejects instead of silently succeeding", async () => {
  const duplicateKey = serializeCacheKey(sampleKey());

  const minimalRecord: SitecoreDataCacheRecord = {
    key: duplicateKey,
    environment: "dev",
    database: "master",
    language: "en",
    itemKind: "id",
    itemValue: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    lastAccessedAt: 1,
  };

  await assert.rejects(() =>
    runItemStoreTransaction("readwrite", async (store) => {
      await getRequestResult(store.add(minimalRecord));
      // Adding the same key twice triggers a genuine IndexedDB ConstraintError.
      await getRequestResult(store.add(minimalRecord));
    }),
  );
});

void test("a missing cache fact differs from a resolved empty fact", async () => {
  const neverHarvested = sampleKey({ item: { kind: "id", value: guidFor(1) } });
  const harvestedEmpty = sampleKey({ item: { kind: "id", value: guidFor(2) } });
  const harvestedWithValues = sampleKey({ item: { kind: "id", value: guidFor(3) } });

  await putFact(harvestedEmpty, "children", { childItems: [] });
  await putFact(harvestedWithValues, "children", { childItems: [{ type: "scItem", scItemId: guidFor(4), scItemName: "Child", scItemPath: undefined, scTemplate: undefined, scItemIcon: undefined, rawMarkup: undefined, link: undefined }] });

  const neverHarvestedFact = await getFact(neverHarvested, "children");
  const harvestedEmptyFact = await getFact(harvestedEmpty, "children");
  const harvestedWithValuesFact = await getFact(harvestedWithValues, "children");

  // Missing: never harvested / unknown.
  assert.equal(neverHarvestedFact, undefined);
  // Resolved empty: harvested and confirmed none.
  assert.ok(harvestedEmptyFact);
  assert.deepEqual(harvestedEmptyFact?.value.childItems, []);
  // Resolved value: harvested and values found.
  assert.equal(harvestedWithValuesFact?.value.childItems.length, 1);
});
