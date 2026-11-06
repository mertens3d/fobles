// @source-path [fobles] tests/unit/item-kind/build-template-inheritance-graph.test.ts

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildTemplateInheritanceGraph,
  type FetchDirectBaseTemplates,
} from "../../../src/content/foundation/reference-data/processing/item-kind/build-template-inheritance-graph.ts";
import type { TemplateIdentity } from "../../../src/content/foundation/reference-data/processing/item-kind/item-kind.types.ts";

function id(n: number): TemplateIdentity {
  return { id: `{t${n}}` };
}

function makeFetcher(graph: Record<string, readonly TemplateIdentity[] | undefined>): {
  fetch: FetchDirectBaseTemplates;
  callCounts: Map<string, number>;
} {
  const callCounts = new Map<string, number>();
  const fetch: FetchDirectBaseTemplates = (template) => {
    callCounts.set(template.id, (callCounts.get(template.id) ?? 0) + 1);
    return Promise.resolve(graph[template.id]);
  };
  return { fetch, callCounts };
}

void test("a template with no base templates produces a single-node graph", async () => {
  const { fetch } = makeFetcher({ [id(1).id]: [] });
  const graph = await buildTemplateInheritanceGraph(id(1), fetch);
  assert.equal(graph.root.directBases.length, 0);
  assert.deepEqual(graph.allTemplateIds, ["t1"]);
  assert.deepEqual(graph.warnings, []);
});

void test("one direct base template is included as a child node", async () => {
  const { fetch } = makeFetcher({ [id(1).id]: [id(2)], [id(2).id]: [] });
  const graph = await buildTemplateInheritanceGraph(id(1), fetch);
  assert.equal(graph.root.directBases.length, 1);
  assert.equal(graph.root.directBases[0].template.id, id(2).id);
  assert.equal(graph.root.directBases[0].depth, 1);
});

void test("multiple direct bases are preserved as separate branches, not flattened", async () => {
  const { fetch } = makeFetcher({ [id(1).id]: [id(2), id(3)], [id(2).id]: [], [id(3).id]: [] });
  const graph = await buildTemplateInheritanceGraph(id(1), fetch);
  assert.equal(graph.root.directBases.length, 2);
  assert.deepEqual(
    graph.root.directBases.map((node) => node.template.id),
    [id(2).id, id(3).id],
  );
});

void test("deep multi-level inheritance records increasing depth", async () => {
  const { fetch } = makeFetcher({ [id(1).id]: [id(2)], [id(2).id]: [id(3)], [id(3).id]: [id(4)], [id(4).id]: [] });
  const graph = await buildTemplateInheritanceGraph(id(1), fetch);
  const level2 = graph.root.directBases[0];
  const level3 = level2.directBases[0];
  const level4 = level3.directBases[0];
  assert.deepEqual([level2.depth, level3.depth, level4.depth], [1, 2, 3]);
  assert.equal(level4.directBases.length, 0);
});

void test("a template reachable via two different branches (diamond) is only fetched once", async () => {
  const { fetch, callCounts } = makeFetcher({
    [id(1).id]: [id(2), id(3)],
    [id(2).id]: [id(4)],
    [id(3).id]: [id(4)],
    [id(4).id]: [],
  });
  const graph = await buildTemplateInheritanceGraph(id(1), fetch);
  assert.equal(callCounts.get(id(4).id), 1);
  assert.deepEqual(graph.allTemplateIds, ["t1", "t2", "t4", "t3"]);
});

void test("a cycle is detected and recorded as a warning instead of looping forever", async () => {
  const { fetch } = makeFetcher({ [id(1).id]: [id(2)], [id(2).id]: [id(1)] });
  const graph = await buildTemplateInheritanceGraph(id(1), fetch);
  assert.equal(
    graph.warnings.some((warning) => warning.kind === "cycle-detected"),
    true,
  );
  assert.deepEqual(graph.allTemplateIds, ["t1", "t2"]);
});

void test("exactly 100 unique templates are included with no limit warning", async () => {
  const graphData: Record<string, readonly TemplateIdentity[] | undefined> = {};
  for (let i = 1; i <= 100; i += 1) {
    graphData[id(i).id] = i < 100 ? [id(i + 1)] : [];
  }
  const { fetch } = makeFetcher(graphData);
  const graph = await buildTemplateInheritanceGraph(id(1), fetch, 100);
  assert.equal(graph.allTemplateIds.length, 100);
  assert.equal(
    graph.warnings.some((warning) => warning.kind === "limit-reached"),
    false,
  );
});

void test("a 101st unique template stops safely and records a limit-reached warning", async () => {
  const graphData: Record<string, readonly TemplateIdentity[] | undefined> = {};
  for (let i = 1; i <= 101; i += 1) {
    graphData[id(i).id] = i < 101 ? [id(i + 1)] : [];
  }
  const { fetch } = makeFetcher(graphData);
  const graph = await buildTemplateInheritanceGraph(id(1), fetch, 100);
  assert.equal(graph.allTemplateIds.length, 100);
  assert.equal(graph.warnings.filter((warning) => warning.kind === "limit-reached").length, 1);
});

void test("a missing/unresolvable base template is marked unresolved without failing the traversal", async () => {
  const { fetch } = makeFetcher({ [id(1).id]: [id(2), id(3)], [id(2).id]: undefined, [id(3).id]: [] });
  const graph = await buildTemplateInheritanceGraph(id(1), fetch);
  const unresolvedNode = graph.root.directBases.find((node) => node.template.id === id(2).id);
  const resolvedNode = graph.root.directBases.find((node) => node.template.id === id(3).id);
  assert.equal(unresolvedNode?.unresolved, true);
  assert.equal(resolvedNode?.unresolved, false);
});

void test("traversal ordering is deterministic across repeated calls", async () => {
  const { fetch: fetchA } = makeFetcher({
    [id(1).id]: [id(2), id(3)],
    [id(2).id]: [id(4)],
    [id(3).id]: [],
    [id(4).id]: [],
  });
  const { fetch: fetchB } = makeFetcher({
    [id(1).id]: [id(2), id(3)],
    [id(2).id]: [id(4)],
    [id(3).id]: [],
    [id(4).id]: [],
  });
  const graphA = await buildTemplateInheritanceGraph(id(1), fetchA);
  const graphB = await buildTemplateInheritanceGraph(id(1), fetchB);
  assert.deepEqual(graphA.allTemplateIds, graphB.allTemplateIds);
});

void test("repeated traversal with the same fetcher is idempotent", async () => {
  const { fetch } = makeFetcher({ [id(1).id]: [id(2)], [id(2).id]: [] });
  const first = await buildTemplateInheritanceGraph(id(1), fetch);
  const second = await buildTemplateInheritanceGraph(id(1), fetch);
  assert.deepEqual(first.allTemplateIds, second.allTemplateIds);
  assert.deepEqual(first.warnings, second.warnings);
});

void test("the selected/immediate template is always the graph root at depth 0", async () => {
  const { fetch } = makeFetcher({ [id(1).id]: [] });
  const graph = await buildTemplateInheritanceGraph(id(1), fetch);
  assert.equal(graph.root.template.id, id(1).id);
  assert.equal(graph.root.depth, 0);
});
