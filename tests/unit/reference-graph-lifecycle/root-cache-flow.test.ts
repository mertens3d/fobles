// @source-path [fobles] tests/unit/reference-graph-lifecycle/root-cache-flow.test.ts

import { test } from "node:test";
import assert from "node:assert/strict";
import { decideRootCacheUsage, rootProcessingStateForDecision } from "../../../src/content/foundation/reference-data/acquisition/root-cache-flow.ts";
import type { SitecoreDataCacheRecord } from "../../../src/content/foundation/cache/sitecore-data/sitecore-data-cache.types";
import type { SitecoreHarvestFiltersState } from "../../../src/content/foundation/harvesting/sitecore-harvester.types";

const FILTERS: SitecoreHarvestFiltersState = {
  parent: false,
  children: false,
  layouts: true,
  referrers: false,
  customFields: false,
  standardFields: false,
  template: false,
};

function baseRecord(overrides: Partial<SitecoreDataCacheRecord> = {}): SitecoreDataCacheRecord {
  return {
    key: "dev::master::en::id::46004574-866d-4702-828e-1c95ad1e03aa",
    environment: "dev",
    database: "master",
    language: "en",
    itemKind: "id",
    itemValue: "46004574-866d-4702-828e-1c95ad1e03aa",
    lastAccessedAt: 1,
    quickInfo: {
      value: {
        result: {
          requested: { kind: "id", value: "46004574-866d-4702-828e-1c95ad1e03aa" },
          status: "found",
          value: {
            type: "scItem",
            scItemId: "46004574-866d-4702-828e-1c95ad1e03aa",
            scItemName: "Home",
            scItemPath: "/sitecore/content/Home",
            scTemplate: undefined,
            scItemIcon: undefined,
            rawMarkup: undefined,
            link: undefined,
          },
        },
        revision: "rev-1",
      },
      cachedAt: 1,
      lastVerifiedAt: 1,
    },
    layout: {
      value: { layoutSectionFields: [] },
      cachedAt: 1,
      lastVerifiedAt: 1,
    },
    ...overrides,
  };
}

void test("root cache hit + revision match uses cache only", () => {
  const decision = decideRootCacheUsage(baseRecord(), FILTERS, "rev-1");

  assert.equal(decision.kind, "cache-only");
  assert.equal(decision.kind === "cache-only" ? decision.result.rootItem.scItemId : undefined, "46004574-866d-4702-828e-1c95ad1e03aa");
});

void test("root cache hit + revision mismatch uses cache then re-harvests", () => {
  const decision = decideRootCacheUsage(baseRecord(), FILTERS, "rev-2");

  assert.equal(decision.kind, "cache-then-reharvest");
  assert.equal(decision.kind === "cache-then-reharvest" ? decision.result.rootItem.scItemName : undefined, "Home");
});

void test("root cache miss requires a harvest", () => {
  const decision = decideRootCacheUsage(undefined, FILTERS, "rev-1");
  assert.equal(decision.kind, "harvest-required");
});

void test("insufficient cached facts for enabled filters requires a harvest", () => {
  const record = baseRecord({ layout: undefined });
  const decision = decideRootCacheUsage(record, FILTERS, "rev-1");
  assert.equal(decision.kind, "harvest-required");
});

void test("unreadable live revision produces cache-unverified, not a reharvest requirement", () => {
  const decision = decideRootCacheUsage(baseRecord(), FILTERS, undefined);

  assert.equal(decision.kind, "cache-unverified");
  assert.equal(decision.kind === "cache-unverified" ? decision.result.rootItem.scItemId : undefined, "46004574-866d-4702-828e-1c95ad1e03aa");
  // "cache-unverified" must never be the trigger for an automatic re-harvest - only
  // "cache-then-reharvest" (a genuine revision mismatch) is.
  assert.notEqual(decision.kind, "cache-then-reharvest");
});

void test("root processing state reflects each cache decision", () => {
  assert.equal(rootProcessingStateForDecision("cache-only"), "verified");
  assert.equal(rootProcessingStateForDecision("cache-then-reharvest"), "stale");
  assert.equal(rootProcessingStateForDecision("cache-unverified"), "unverified");
  assert.equal(rootProcessingStateForDecision("harvest-required"), "enriched");
});
