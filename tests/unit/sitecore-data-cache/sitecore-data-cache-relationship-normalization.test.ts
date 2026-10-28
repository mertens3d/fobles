// @source-path [fobles] tests/unit/sitecore-data-cache/sitecore-data-cache-relationship-normalization.test.ts

import "fake-indexeddb/auto";
import { beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { DATABASE_NAME, FACT_ITEM_KEY_INDEX_NAME, getRequestResult, resetDatabaseConnectionForTests, runCacheTransaction } from "../../../src/content/foundation/cache/sitecore-data/indexed-db.ts";
import { getFact, putFact } from "../../../src/content/foundation/cache/sitecore-data/sitecore-data-cache.ts";
import { serializeCacheKey } from "../../../src/content/foundation/cache/sitecore-data/sitecore-data-cache-key.ts";
import type { SitecoreDataCacheFactRecord, SitecoreDataCacheKey } from "../../../src/content/foundation/cache/sitecore-data/sitecore-data-cache.types.ts";
import type { ItemGraphNodeData } from "../../../src/content/foundation/reference-data/model/sitecore-item.types.ts";

function key(): SitecoreDataCacheKey {
  return { environment: "DEV", database: "master", language: "en", item: { kind: "id", value: "abec2184-8e09-447a-becc-956244ed7bf6" } };
}
function item(scItemId: string | undefined, scItemPath: string | undefined): ItemGraphNodeData {
  return { type: "scItem", scItemName: "Item", scItemId, link: undefined, scItemPath, scTemplate: undefined, scItemIcon: undefined, rawMarkup: undefined, facts: {} };
}
async function storedFacts(): Promise<SitecoreDataCacheFactRecord[]> {
  return runCacheTransaction("readonly", (_, factStore) => getRequestResult(factStore.index(FACT_ITEM_KEY_INDEX_NAME).getAll(serializeCacheKey(key())))) as Promise<SitecoreDataCacheFactRecord[]>;
}

void beforeEach(async () => {
  resetDatabaseConnectionForTests();
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DATABASE_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error("Failed to reset test database"));
  });
});

void test("parent persists only an ID locator when a GUID is available", async () => {
  await putFact(key(), "parent", { parent: item("{B52269FE-554F-4C0F-A0C9-B9ED8D7249F4}", "/sitecore/content/Home") });
  const [record] = await storedFacts();
  assert.deepEqual(record.fact.value, { parent: { kind: "id", value: "B52269FE-554F-4C0F-A0C9-B9ED8D7249F4" } });
});

void test("parent persists a path locator when no GUID is available", async () => {
  await putFact(key(), "parent", { parent: item("", "/sitecore/content/Home") });
  const [record] = await storedFacts();
  assert.deepEqual(record.fact.value, { parent: { kind: "path", value: "/sitecore/content/Home" } });
});

void test("relationship facts rehydrate locator placeholders for existing runtime callers", async () => {
  await putFact(key(), "children", { childItems: [item("{B52269FE-554F-4C0F-A0C9-B9ED8D7249F4}", "/ignored"), item("", "/sitecore/content/Home")] });
  const fact = await getFact(key(), "children");
  assert.equal(fact?.value.childItems[0]?.scItemId, "B52269FE-554F-4C0F-A0C9-B9ED8D7249F4");
  assert.equal(fact?.value.childItems[1]?.scItemPath, "/sitecore/content/Home");
  assert.equal(fact?.value.childItems[0]?.scItemName, undefined);
});
