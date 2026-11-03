// @source-path [fobles] tests/unit/classification/find-nearest-ancestor.test.ts

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  findNearestAncestorByClassification,
  type AncestorWalkItem,
  type ClassifyAncestor,
  type GetParentItem,
} from "../../../src/content/foundation/reference-data/processing/classification/find-nearest-ancestor.ts";
import type { ItemClassification } from "../../../src/content/foundation/reference-data/processing/classification/item-classification.types.ts";

function item(id: string): AncestorWalkItem {
  return { id, itemPath: `/sitecore/content/${id}` };
}

function chainOf(ids: readonly string[]): GetParentItem {
  return (current) => {
    const index = ids.indexOf(current.id);
    const parentId = index >= 0 ? ids[index + 1] : undefined;
    return Promise.resolve(parentId ? item(parentId) : undefined);
  };
}

function classifyBy(classifications: Record<string, ItemClassification>): ClassifyAncestor {
  return (current) => Promise.resolve(classifications[current.id] ?? "other");
}

void test("the selected item itself matches and is returned without walking further", async () => {
  const result = await findNearestAncestorByClassification(
    item("a"),
    "site",
    classifyBy({ a: "site" }),
    chainOf(["a", "b"]),
  );
  assert.deepEqual(result, { outcome: "found", item: item("a") });
});

void test("the nearest matching ancestor wins, not a further one that also matches", async () => {
  const chain = ["a", "b", "c", "d"];
  const result = await findNearestAncestorByClassification(
    item("a"),
    "tenant",
    classifyBy({ c: "tenant", d: "tenant" }),
    chainOf(chain),
  );
  assert.equal(result.outcome, "found");
  assert.equal(result.outcome === "found" ? result.item.id : undefined, "c");
});

void test("no matching ancestor anywhere in the chain returns not-found", async () => {
  const result = await findNearestAncestorByClassification(item("a"), "site", classifyBy({}), chainOf(["a", "b", "c"]));
  assert.deepEqual(result, { outcome: "not-found" });
});

void test("a parent cycle is detected instead of looping forever", async () => {
  const getParent: GetParentItem = (current) => Promise.resolve(current.id === "b" ? item("a") : item("b"));
  const result = await findNearestAncestorByClassification(item("a"), "site", classifyBy({}), getParent);
  assert.equal(result.outcome, "cycle-detected");
});

void test("exactly 100 visited items are checked when no match exists", async () => {
  const ids = Array.from({ length: 100 }, (_, index) => `item-${index}`);
  let classifyCalls = 0;
  const classify: ClassifyAncestor = () => {
    classifyCalls += 1;
    return Promise.resolve("other");
  };
  const result = await findNearestAncestorByClassification(item(ids[0]), "site", classify, chainOf(ids), 100);
  assert.equal(result.outcome, "not-found");
  assert.equal(classifyCalls, 100);
});

void test("a 101st visited item stops safely with a limit-reached outcome", async () => {
  const ids = Array.from({ length: 101 }, (_, index) => `item-${index}`);
  let classifyCalls = 0;
  const classify: ClassifyAncestor = () => {
    classifyCalls += 1;
    return Promise.resolve("other");
  };
  const result = await findNearestAncestorByClassification(item(ids[0]), "site", classify, chainOf(ids), 100);
  assert.deepEqual(result, { outcome: "limit-reached", limit: 100 });
  assert.equal(classifyCalls, 100);
});

void test("walking stops as soon as a match is found - the parent beyond it is never requested", async () => {
  let getParentCalls = 0;
  const getParent: GetParentItem = (current) => {
    getParentCalls += 1;
    return Promise.resolve(current.id === "a" ? item("b") : undefined);
  };
  const result = await findNearestAncestorByClassification(item("a"), "site", classifyBy({ b: "site" }), getParent);
  assert.equal(result.outcome, "found");
  assert.equal(getParentCalls, 1);
});

void test("Site and Tenant targets are resolved independently against the same chain", async () => {
  const chain = ["a", "b", "c"];
  const classifications: Record<string, ItemClassification> = { b: "site", c: "tenant" };
  const siteResult = await findNearestAncestorByClassification(
    item("a"),
    "site",
    classifyBy(classifications),
    chainOf(chain),
  );
  const tenantResult = await findNearestAncestorByClassification(
    item("a"),
    "tenant",
    classifyBy(classifications),
    chainOf(chain),
  );
  assert.equal(siteResult.outcome === "found" ? siteResult.item.id : undefined, "b");
  assert.equal(tenantResult.outcome === "found" ? tenantResult.item.id : undefined, "c");
});
