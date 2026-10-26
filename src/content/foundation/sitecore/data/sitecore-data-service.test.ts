// @source-path [fobles] src/content/foundation/sitecore/data/sitecore-data-service.test.ts

import "fake-indexeddb/auto";
import { beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import {
  DATABASE_NAME,
  getRequestResult,
  resetDatabaseConnectionForTests,
  runItemStoreTransaction,
} from "../../cache/sitecore-data/indexed-db.ts";
import * as cache from "../../cache/sitecore-data/sitecore-data-cache.ts";
import { serializeCacheKey } from "../../cache/sitecore-data/sitecore-data-cache-key.ts";
import type { SitecoreDataCacheKey, SitecoreDataCacheRecord } from "../../cache/sitecore-data/sitecore-data-cache.types";
import { factNameForTaskType, getFact } from "./sitecore-data-service.ts";
import type {
  WorkerTaskCancelledResult,
  WorkerTaskDocumentStaleResult,
  WorkerTaskErrorResult,
  WorkerTaskExecutionResult,
  WorkerTaskSuccessResult,
} from "../../workers/tasks/worker-task.types";

function sampleKey(overrides: Partial<SitecoreDataCacheKey> = {}): SitecoreDataCacheKey {
  return {
    environment: "https://dev.example.com",
    database: "master",
    language: "en",
    item: { kind: "id", value: "46004574-866d-4702-828e-1c95ad1e03aa" },
    ...overrides,
  };
}

function successResult(type: WorkerTaskSuccessResult["type"], payload: unknown): WorkerTaskSuccessResult {
  return { requestId: "r1", taskId: crypto.randomUUID(), type, status: "success", payload } as WorkerTaskSuccessResult;
}

function errorResult(type: WorkerTaskErrorResult["type"]): WorkerTaskErrorResult {
  return { requestId: "r1", taskId: crypto.randomUUID(), type, status: "error", errorMessage: "boom" };
}

function cancelledResult(type: WorkerTaskCancelledResult["type"]): WorkerTaskCancelledResult {
  return { requestId: "r1", taskId: crypto.randomUUID(), type, status: "cancelled" };
}

function documentStaleResult(type: WorkerTaskDocumentStaleResult["type"]): WorkerTaskDocumentStaleResult {
  return { requestId: "r1", taskId: crypto.randomUUID(), type, status: "document-stale" };
}

function countingFetchLive(result: WorkerTaskExecutionResult): { fetchLive: () => Promise<WorkerTaskExecutionResult>; callCount: () => number } {
  let calls = 0;

  return {
    fetchLive: () => {
      calls += 1;
      return Promise.resolve(result);
    },
    callCount: () => calls,
  };
}

async function peekRecord(key: SitecoreDataCacheKey): Promise<SitecoreDataCacheRecord | undefined> {
  return runItemStoreTransaction("readonly", (store) => {
    const request = store.get(serializeCacheKey(key)) as IDBRequest<SitecoreDataCacheRecord | undefined>;
    return getRequestResult(request);
  });
}

beforeEach(async () => {
  resetDatabaseConnectionForTests();

  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DATABASE_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error("Failed to reset test database"));
  });
});

void test("first request with empty cache executes the worker", async () => {
  const live = countingFetchLive(successResult("get-parent", { parent: undefined }));
  await getFact(sampleKey(), "parent", live.fetchLive);
  assert.equal(live.callCount(), 1);
});

void test("live result is cached", async () => {
  const live = countingFetchLive(successResult("get-children", { childItems: [] }));
  const key = sampleKey();
  await getFact(key, "children", live.fetchLive);

  const cached = await cache.getFact(key, "children");
  assert.ok(cached);
  assert.deepEqual(cached?.value, { childItems: [] });
});

void test("second identical request returns cache without executing the worker", async () => {
  const live = countingFetchLive(successResult("get-referrers", { referrers: [] }));
  const key = sampleKey();

  await getFact(key, "referrers", live.fetchLive);
  await getFact(key, "referrers", live.fetchLive);

  assert.equal(live.callCount(), 1);
});

void test("result reports source=live on first request", async () => {
  const live = countingFetchLive(successResult("get-parent", { parent: undefined }));
  const outcome = await getFact(sampleKey(), "parent", live.fetchLive);

  assert.equal(outcome.outcome, "resolved");
  assert.equal(outcome.outcome === "resolved" ? outcome.fact.source : undefined, "live");
});

void test("result reports source=cache on second request", async () => {
  const live = countingFetchLive(successResult("get-parent", { parent: undefined }));
  const key = sampleKey();

  await getFact(key, "parent", live.fetchLive);
  const outcome = await getFact(key, "parent", live.fetchLive);

  assert.equal(outcome.outcome === "resolved" ? outcome.fact.source : undefined, "cache");
});

void test("cache hit does not change lastVerifiedAt", async () => {
  const live = countingFetchLive(successResult("get-parent", { parent: undefined }));
  const key = sampleKey();

  await getFact(key, "parent", live.fetchLive);
  const firstRecord = await peekRecord(key);
  const firstVerifiedAt = firstRecord?.parent?.lastVerifiedAt;

  await getFact(key, "parent", live.fetchLive);
  const secondRecord = await peekRecord(key);

  assert.equal(secondRecord?.parent?.lastVerifiedAt, firstVerifiedAt);
});

void test("cache hit does update lastAccessedAt", async () => {
  const live = countingFetchLive(successResult("get-parent", { parent: undefined }));
  const key = sampleKey();

  await getFact(key, "parent", live.fetchLive);

  await runItemStoreTransaction("readwrite", async (store) => {
    const request = store.get(serializeCacheKey(key)) as IDBRequest<SitecoreDataCacheRecord>;
    const existing = await getRequestResult(request);
    existing.lastAccessedAt = 1;
    await getRequestResult(store.put(existing));
  });

  await getFact(key, "parent", live.fetchLive);
  const record = await peekRecord(key);

  assert.ok(record && record.lastAccessedAt > 1);
});

void test("cached not-found suppresses another worker lookup", async () => {
  const notFoundPayload = { result: { requested: sampleKey().item, status: "not-found" as const } };
  const live = countingFetchLive(successResult("get-quick-info", notFoundPayload));
  const key = sampleKey();

  const first = await getFact(key, "quickInfo", live.fetchLive);
  const second = await getFact(key, "quickInfo", live.fetchLive);

  assert.equal(live.callCount(), 1);
  assert.equal(first.outcome === "resolved" ? first.fact.value.result.status : undefined, "not-found");
  assert.equal(second.outcome === "resolved" ? second.fact.source : undefined, "cache");
});

void test("worker error is not cached", async () => {
  const live = countingFetchLive(errorResult("get-parent"));
  const key = sampleKey();

  const outcome = await getFact(key, "parent", live.fetchLive);

  assert.equal(outcome.outcome, "unresolved");
  assert.equal(await cache.getFact(key, "parent"), undefined);
});

void test("cancelled result is not cached", async () => {
  const live = countingFetchLive(cancelledResult("get-parent"));
  const key = sampleKey();

  const outcome = await getFact(key, "parent", live.fetchLive);

  assert.equal(outcome.outcome, "unresolved");
  assert.equal(await cache.getFact(key, "parent"), undefined);
});

void test("document-stale is not cached", async () => {
  const live = countingFetchLive(documentStaleResult("get-parent"));
  const key = sampleKey();

  const outcome = await getFact(key, "parent", live.fetchLive);

  assert.equal(outcome.outcome, "unresolved");
  assert.equal(await cache.getFact(key, "parent"), undefined);
});

void test("environment isolates results", async () => {
  const live = countingFetchLive(successResult("get-parent", { parent: undefined }));

  await getFact(sampleKey({ environment: "https://dev.example.com" }), "parent", live.fetchLive);
  await getFact(sampleKey({ environment: "https://qa.example.com" }), "parent", live.fetchLive);

  assert.equal(live.callCount(), 2);
});

void test("database isolates results", async () => {
  const live = countingFetchLive(successResult("get-parent", { parent: undefined }));

  await getFact(sampleKey({ database: "master" }), "parent", live.fetchLive);
  await getFact(sampleKey({ database: "web" }), "parent", live.fetchLive);

  assert.equal(live.callCount(), 2);
});

void test("language isolates results", async () => {
  const live = countingFetchLive(successResult("get-parent", { parent: undefined }));

  await getFact(sampleKey({ language: "en" }), "parent", live.fetchLive);
  await getFact(sampleKey({ language: "da" }), "parent", live.fetchLive);

  assert.equal(live.callCount(), 2);
});

void test("path and GUID identities stay distinct", async () => {
  const live = countingFetchLive(successResult("get-parent", { parent: undefined }));
  const value = "46004574-866d-4702-828e-1c95ad1e03aa";

  await getFact(sampleKey({ item: { kind: "id", value } }), "parent", live.fetchLive);
  await getFact(sampleKey({ item: { kind: "path", value } }), "parent", live.fetchLive);

  assert.equal(live.callCount(), 2);
});

void test("raw values operations bypass the cache", () => {
  assert.equal(factNameForTaskType("set-raw-values"), undefined);
});

void test("standard fields operations bypass the cache", () => {
  assert.equal(factNameForTaskType("set-standard-fields"), undefined);
});

void test("requested/resolved GUID validation still prevents a Sitecore fallback Home", async () => {
  // Mirrors worker-task-executor.ts's executeGetQuickInfo contract: an unresolved GUID reports
  // not-found (never the fallback item's own data) - the service must preserve that distinction
  // rather than treating a "resolved" quickInfo payload as automatically "found".
  const requested = { kind: "id" as const, value: "46004574-866d-4702-828e-1c95ad1e03aa" };
  const payload = {
    result: { requested, resolved: { itemId: "11111111-1111-1111-1111-111111111111" }, status: "not-found" as const },
  };
  const live = countingFetchLive(successResult("get-quick-info", payload));

  const outcome = await getFact(sampleKey({ item: requested }), "quickInfo", live.fetchLive);

  assert.equal(outcome.outcome === "resolved" ? outcome.fact.value.result.status : undefined, "not-found");
});

void test("listItems returns cache records through the public API", async () => {
  const live = countingFetchLive(successResult("get-parent", { parent: undefined }));

  await getFact(sampleKey({ item: { kind: "id", value: "11111111-1111-1111-1111-111111111111" } }), "parent", live.fetchLive);
  await getFact(sampleKey({ item: { kind: "id", value: "22222222-2222-2222-2222-222222222222" } }), "parent", live.fetchLive);

  const records = await cache.listItems();
  assert.equal(records.length, 2);
});

void test("concurrent requests do not corrupt item records", async () => {
  const key = sampleKey();
  const parentLive = countingFetchLive(successResult("get-parent", { parent: undefined }));
  const childrenLive = countingFetchLive(successResult("get-children", { childItems: [] }));

  await Promise.all([
    getFact(key, "parent", parentLive.fetchLive),
    getFact(key, "children", childrenLive.fetchLive),
  ]);

  const record = await peekRecord(key);
  assert.ok(record?.parent);
  assert.ok(record?.children);
});
