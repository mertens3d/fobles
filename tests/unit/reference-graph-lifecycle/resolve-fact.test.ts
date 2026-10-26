// @source-path [fobles] tests/unit/reference-graph-lifecycle/resolve-fact.test.ts

import "fake-indexeddb/auto";
import { beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import {
  DATABASE_NAME,
  resetDatabaseConnectionForTests,
} from "../../../src/content/foundation/cache/sitecore-data/indexed-db.ts";
import * as cache from "../../../src/content/foundation/cache/sitecore-data/sitecore-data-cache.ts";
import { resolveItemFact } from "../../../src/content/foundation/reference-data/processing/resolve-fact.ts";
import type { SitecoreDataCacheKey } from "../../../src/content/foundation/cache/sitecore-data/sitecore-data-cache.types";
import type { WorkerTaskExecutionResult, WorkerTaskPayloadByType, WorkerTaskSuccessResult } from "../../../src/content/foundation/workers/tasks/worker-task.types";

function sampleKey(): SitecoreDataCacheKey {
  return {
    environment: "dev",
    database: "master",
    language: "en",
    item: { kind: "id", value: "46004574-866d-4702-828e-1c95ad1e03aa" },
  };
}

function quickInfoPayload(revision: string, itemName = "Home"): WorkerTaskPayloadByType["get-quick-info"] {
  return {
    result: {
      requested: sampleKey().item,
      status: "found",
      value: {
        type: "scItem",
        scItemId: "46004574-866d-4702-828e-1c95ad1e03aa",
        scItemName: itemName,
        scItemPath: "/sitecore/content/Home",
        scTemplate: undefined,
        scItemIcon: undefined,
        rawMarkup: undefined,
        link: undefined,
      },
    },
    revision,
  };
}

function quickInfoResult(revision: string, itemName = "Home"): WorkerTaskSuccessResult {
  return {
    requestId: "r1",
    taskId: crypto.randomUUID(),
    type: "get-quick-info",
    status: "success",
    payload: quickInfoPayload(revision, itemName),
  };
}

function fetchLiveOnce(result: WorkerTaskExecutionResult): () => Promise<WorkerTaskExecutionResult> {
  return () => Promise.resolve(result);
}

beforeEach(async () => {
  resetDatabaseConnectionForTests();

  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DATABASE_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error("Failed to reset test database"));
  });
});

void test("enrichment-only referenced item (no prior cache) resolves as enriched", async () => {
  const key = sampleKey();
  const outcome = await resolveItemFact(key, fetchLiveOnce(quickInfoResult("rev-1")));

  assert.equal(outcome.kind, "enriched");

  const cached = await cache.getFact(key, "quickInfo");
  assert.equal(cached?.value.revision, "rev-1");
});

void test("cached referenced item revision match is verified and bumps lastVerifiedAt", async () => {
  const key = sampleKey();
  await cache.putFact(key, "quickInfo", quickInfoPayload("rev-1"));
  const before = await cache.getFact(key, "quickInfo");

  const outcome = await resolveItemFact(key, fetchLiveOnce(quickInfoResult("rev-1")));

  assert.equal(outcome.kind, "verified");

  const after = await cache.getFact(key, "quickInfo");
  assert.ok(after && before);
  assert.ok(after.lastVerifiedAt >= before.lastVerifiedAt);
});

void test("cached referenced item revision mismatch is reported stale", async () => {
  const key = sampleKey();
  await cache.putFact(key, "quickInfo", quickInfoPayload("rev-1"));

  const outcome = await resolveItemFact(key, fetchLiveOnce(quickInfoResult("rev-2", "Home Renamed")));

  assert.equal(outcome.kind, "stale");
  assert.equal(outcome.kind === "stale" ? outcome.hadStructuralCache : undefined, false);

  const after = await cache.getFact(key, "quickInfo");
  assert.equal(after?.value.revision, "rev-2");
});

void test("a stale item with cached structural facts reports hadStructuralCache", async () => {
  const key = sampleKey();
  await cache.putFact(key, "quickInfo", quickInfoPayload("rev-1"));
  await cache.putFact(key, "parent", { parent: undefined });

  const outcome = await resolveItemFact(key, fetchLiveOnce(quickInfoResult("rev-2")));

  assert.equal(outcome.kind, "stale");
  assert.equal(outcome.kind === "stale" ? outcome.hadStructuralCache : undefined, true);
});

void test("an unreadable live revision is reported as unverified, never stale", async () => {
  const key = sampleKey();
  await cache.putFact(key, "quickInfo", quickInfoPayload("rev-1"));

  const unreadableRevisionResult: WorkerTaskSuccessResult = {
    requestId: "r1",
    taskId: crypto.randomUUID(),
    type: "get-quick-info",
    status: "success",
    payload: { result: quickInfoPayload("rev-2").result, revision: undefined },
  };

  const outcome = await resolveItemFact(key, fetchLiveOnce(unreadableRevisionResult));

  assert.equal(outcome.kind, "unverified");
  assert.notEqual(outcome.kind, "stale");
});

void test("an unreadable live revision on a brand-new item is unverified, not enriched", async () => {
  const key = sampleKey();

  const unreadableRevisionResult: WorkerTaskSuccessResult = {
    requestId: "r1",
    taskId: crypto.randomUUID(),
    type: "get-quick-info",
    status: "success",
    payload: { result: quickInfoPayload("rev-1").result, revision: undefined },
  };

  const outcome = await resolveItemFact(key, fetchLiveOnce(unreadableRevisionResult));

  assert.equal(outcome.kind, "unverified");
});

void test("a not-found live result is reported as not-found and is not cached", async () => {
  const key = sampleKey();

  const notFoundResult: WorkerTaskSuccessResult = {
    requestId: "r1",
    taskId: crypto.randomUUID(),
    type: "get-quick-info",
    status: "success",
    payload: { result: { requested: key.item, status: "not-found" }, revision: undefined },
  };

  const outcome = await resolveItemFact(key, fetchLiveOnce(notFoundResult));

  assert.equal(outcome.kind, "not-found");
  assert.equal(await cache.getFact(key, "quickInfo"), undefined);
});

void test("a failed live result is reported as failed", async () => {
  const key = sampleKey();

  const errorResult: WorkerTaskExecutionResult = {
    requestId: "r1",
    taskId: crypto.randomUUID(),
    type: "get-quick-info",
    status: "error",
    errorMessage: "boom",
  };

  const outcome = await resolveItemFact(key, fetchLiveOnce(errorResult));

  assert.equal(outcome.kind, "failed");
});
