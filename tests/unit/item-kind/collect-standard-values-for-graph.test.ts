// @source-path [fobles] tests/unit/item-kind/collect-standard-values-for-graph.test.ts

import { test } from "node:test";
import assert from "node:assert/strict";
import { collectStandardValuesForTemplateGraph } from "../../../src/content/foundation/reference-data/processing/item-kind/collect-standard-values-for-graph.ts";
import type { TemplateInheritanceGraph } from "../../../src/content/foundation/reference-data/processing/item-kind/item-kind.types.ts";

function graphWith(rootId: string, allTemplateIds: readonly string[]): TemplateInheritanceGraph {
  return {
    root: { template: { id: rootId }, depth: 0, directBases: [], unresolved: false },
    allTemplateIds,
    warnings: [],
  };
}

void test("only the selected template's Standard Values is fetched when inheritance is not included", async () => {
  const graph = graphWith("t1", ["t1", "t2", "t3"]);
  const calls: string[] = [];
  const result = await collectStandardValuesForTemplateGraph(
    graph,
    (templateId) => {
      calls.push(templateId);
      return Promise.resolve(`sv-${templateId}`);
    },
    false,
  );
  assert.deepEqual(calls, ["t1"]);
  assert.equal(result.get("t1"), "sv-t1");
});

void test("Standard Values is fetched for every inheritance template when included", async () => {
  const graph = graphWith("t1", ["t1", "t2", "t3"]);
  const calls: string[] = [];
  await collectStandardValuesForTemplateGraph(
    graph,
    (templateId) => {
      calls.push(templateId);
      return Promise.resolve(`sv-${templateId}`);
    },
    true,
  );
  assert.deepEqual([...calls].sort(), ["t1", "t2", "t3"]);
});

void test("a single failing fetch does not prevent the other templates' Standard Values from resolving", async () => {
  const graph = graphWith("t1", ["t1", "t2", "t3"]);
  const result = await collectStandardValuesForTemplateGraph(
    graph,
    (templateId) => {
      if (templateId === "t2") {
        return Promise.reject(new Error("boom"));
      }
      return Promise.resolve(`sv-${templateId}`);
    },
    true,
  );
  assert.equal(result.get("t1"), "sv-t1");
  assert.equal(result.get("t2"), undefined);
  assert.equal(result.get("t3"), "sv-t3");
});

void test("each Standard Values result is associated with the correct owning template", async () => {
  const graph = graphWith("t1", ["t1", "t2"]);
  const result = await collectStandardValuesForTemplateGraph(
    graph,
    (templateId) => Promise.resolve({ owner: templateId }),
    true,
  );
  assert.deepEqual(result.get("t1"), { owner: "t1" });
  assert.deepEqual(result.get("t2"), { owner: "t2" });
});

void test("an existing Standard Values item is present in the result map", async () => {
  const graph = graphWith("t1", ["t1"]);
  const result = await collectStandardValuesForTemplateGraph(graph, () => Promise.resolve("found"), false);
  assert.equal(result.get("t1"), "found");
});

void test("a missing (resolved-undefined) Standard Values item is present as undefined, not omitted", async () => {
  const graph = graphWith("t1", ["t1"]);
  const result = await collectStandardValuesForTemplateGraph(graph, () => Promise.resolve(undefined), false);
  assert.equal(result.has("t1"), true);
  assert.equal(result.get("t1"), undefined);
});
