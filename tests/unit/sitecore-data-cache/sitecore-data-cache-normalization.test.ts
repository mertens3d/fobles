// @source-path [fobles] tests/unit/sitecore-data-cache/sitecore-data-cache-normalization.test.ts
import "fake-indexeddb/auto";
import { beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { DATABASE_NAME, FACT_ITEM_KEY_INDEX_NAME, getRequestResult, resetDatabaseConnectionForTests, runCacheTransaction } from "../../../src/content/foundation/cache/sitecore-data/indexed-db.ts";
import { deleteItem, getFact, putFact } from "../../../src/content/foundation/cache/sitecore-data/sitecore-data-cache.ts";
import { serializeCacheKey } from "../../../src/content/foundation/cache/sitecore-data/sitecore-data-cache-key.ts";
import type { SitecoreDataCacheKey } from "../../../src/content/foundation/cache/sitecore-data/sitecore-data-cache.types.ts";
function key(): SitecoreDataCacheKey { return { environment: "DEV", database: "master", language: "en", item: { kind: "id", value: "46004574-866d-4702-828e-1c95ad1e03aa" } }; }
void beforeEach(async () => { resetDatabaseConnectionForTests(); await new Promise<void>((resolve, reject) => { const request = indexedDB.deleteDatabase(DATABASE_NAME); request.onsuccess = () => resolve(); request.onerror = () => reject(request.error); }); });
void test("facts are persisted as separate records", async () => { await putFact(key(), "children", { childItems: [] }); await putFact(key(), "referrers", { referrers: [] }); const count = await runCacheTransaction("readonly", (_, factStore) => getRequestResult(factStore.index(FACT_ITEM_KEY_INDEX_NAME).count(serializeCacheKey(key())))); assert.equal(count, 2); });
void test("deleting an item cascade-deletes every fact", async () => { await putFact(key(), "children", { childItems: [] }); await putFact(key(), "referrers", { referrers: [] }); await deleteItem(key()); assert.equal(await getFact(key(), "children"), undefined); assert.equal(await getFact(key(), "referrers"), undefined); const count = await runCacheTransaction("readonly", (_, factStore) => getRequestResult(factStore.index(FACT_ITEM_KEY_INDEX_NAME).count(serializeCacheKey(key())))); assert.equal(count, 0); });
