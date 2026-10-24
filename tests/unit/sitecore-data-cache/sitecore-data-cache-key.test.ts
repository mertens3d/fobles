// @source-path [fobles] tests/unit/sitecore-data-cache/sitecore-data-cache-key.test.ts

import { test } from "node:test";
import assert from "node:assert/strict";
import { serializeCacheKey } from "../../../src/content/sitecore-data-cache/sitecore-data-cache-key.ts";
import type { SitecoreDataCacheKey } from "../../../src/content/sitecore-data-cache/sitecore-data-cache.types";

function baseKey(overrides: Partial<SitecoreDataCacheKey> = {}): SitecoreDataCacheKey {
  return {
    environment: "DEV",
    database: "master",
    language: "en",
    item: { kind: "id", value: "46004574-866D-4702-828E-1C95AD1E03AA" },
    ...overrides,
  };
}

void test("deterministic key generation", () => {
  assert.equal(serializeCacheKey(baseKey()), serializeCacheKey(baseKey()));
});

void test("environment isolation", () => {
  assert.notEqual(
    serializeCacheKey(baseKey({ environment: "DEV" })),
    serializeCacheKey(baseKey({ environment: "QA" })),
  );
});

void test("database isolation", () => {
  assert.notEqual(
    serializeCacheKey(baseKey({ database: "master" })),
    serializeCacheKey(baseKey({ database: "web" })),
  );
});

void test("language isolation", () => {
  assert.notEqual(
    serializeCacheKey(baseKey({ language: "en" })),
    serializeCacheKey(baseKey({ language: "da" })),
  );
});

void test("GUID normalization", () => {
  const withBracesAndCase = baseKey({
    item: { kind: "id", value: "{46004574-866D-4702-828E-1C95AD1E03AA}" },
  });
  const trimmedLowercase = baseKey({
    item: { kind: "id", value: " 46004574-866d-4702-828e-1c95ad1e03aa " },
  });

  assert.equal(serializeCacheKey(withBracesAndCase), serializeCacheKey(trimmedLowercase));
});

void test("GUID identity remains distinct from path identity", () => {
  const guidKey = baseKey({ item: { kind: "id", value: "46004574-866d-4702-828e-1c95ad1e03aa" } });
  const pathKey = baseKey({ item: { kind: "path", value: "46004574-866d-4702-828e-1c95ad1e03aa" } });

  assert.notEqual(serializeCacheKey(guidKey), serializeCacheKey(pathKey));
});
