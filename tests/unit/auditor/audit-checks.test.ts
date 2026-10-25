// @source-path [fobles] tests/unit/auditor/audit-checks.test.ts

import { test } from "node:test";
import assert from "node:assert/strict";
import { itemResolvedCheck } from "../../../src/content/features/auditor/checks/item-resolved-check.ts";
import { itemNavigationCheck } from "../../../src/content/features/auditor/checks/item-navigation-check.ts";
import { referenceResolvedCheck } from "../../../src/content/features/auditor/checks/reference-resolved-check.ts";
import { cacheValidationCheck } from "../../../src/content/features/auditor/checks/cache-validation-check.ts";
import { createAuditFindingStore } from "../../../src/content/features/auditor/audit-finding-store.ts";
import type { AuditCheckContext } from "../../../src/content/features/auditor/audit-check.types";
import type { ItemGraphNodeData } from "../../../src/content/features/reference-model/sitecore-item.types";
import type { ReferenceModelItemNode, ReferenceModelNode } from "../../../src/content/features/reference-model/reference-model.types";
import type { ProcessingStatus } from "../../../src/content/features/reference-graph/lifecycle/processing-state.ts";

function makeItem(overrides: Partial<ItemGraphNodeData> = {}): ItemGraphNodeData {
  return {
    type: "scItem",
    scItemName: undefined,
    scItemId: undefined,
    link: undefined,
    scItemPath: undefined,
    scTemplate: undefined,
    scItemIcon: undefined,
    rawMarkup: undefined,
    ...overrides,
  };
}

function makeItemNode(treeNodeId: string, item: ItemGraphNodeData, children: ReferenceModelNode[] = []): ReferenceModelItemNode {
  return {
    treeNodeId,
    nodeType: "item",
    scItem: item,
    provenance: { type: "synthetic", label: treeNodeId },
    children,
  };
}

function makeContext(overrides: Partial<AuditCheckContext>): AuditCheckContext {
  return {
    signal: new AbortController().signal,
    referenceModelRoot: makeItemNode("root", makeItem()),
    referenceModelNodesById: new Map(),
    findingStore: createAuditFindingStore(),
    processingStateByTreeNodeId: new Map(),
    cacheRevalidationResultByTreeNodeId: new Map(),
    buildSitecoreUrl: (identity) => `https://example.test/sitecore/shell/Applications/Content%20Editor.aspx?fo=${identity}`,
    ...overrides,
  };
}

// --- item-resolved-check (check 1) ---

void test("item-resolved-check: passed when identity + display metadata both resolved", async () => {
  const root = makeItemNode("root", makeItem({ scItemId: "id-1", scItemPath: "/sitecore/content/home", scItemName: "Home", scTemplate: makeItem({ scItemName: "Sample Item" }) }));
  const context = makeContext({ referenceModelRoot: root });

  await itemResolvedCheck.run(context);

  assert.equal(context.findingStore.getSnapshot()[0]?.status, "passed");
});

void test("item-resolved-check: warning when identity resolved but display metadata missing", async () => {
  const root = makeItemNode("root", makeItem({ scItemId: "id-1", scItemPath: "/sitecore/content/home" }));
  const context = makeContext({ referenceModelRoot: root });

  await itemResolvedCheck.run(context);

  assert.equal(context.findingStore.getSnapshot()[0]?.status, "warning");
});

void test("item-resolved-check: error when the root has no identity at all", async () => {
  const root = makeItemNode("root", makeItem());
  const context = makeContext({ referenceModelRoot: root });

  await itemResolvedCheck.run(context);

  assert.equal(context.findingStore.getSnapshot()[0]?.status, "error");
});

// --- item-navigation-check (check 4) ---

void test("item-navigation-check: passed for every item node carrying an id or path", async () => {
  const child = makeItemNode("child", makeItem({ scItemPath: "/sitecore/content/child" }));
  const root = makeItemNode("root", makeItem({ scItemId: "id-1" }), [child]);
  const context = makeContext({ referenceModelRoot: root });

  await itemNavigationCheck.run(context);

  const statuses = context.findingStore.getSnapshot().map((finding) => finding.status);
  assert.deepEqual(statuses.sort(), ["passed", "passed"]);
});

void test("item-navigation-check: warning for an item node with no id or path", async () => {
  const root = makeItemNode("root", makeItem());
  const context = makeContext({ referenceModelRoot: root });

  await itemNavigationCheck.run(context);

  assert.equal(context.findingStore.getSnapshot()[0]?.status, "warning");
});

// --- reference-resolved-check (check 2) ---

function contextWithProcessingState(status: ProcessingStatus | undefined): AuditCheckContext {
  const node = makeItemNode("node-1", makeItem({ scItemId: "id-1" }));
  const processingStateByTreeNodeId = new Map<string, ProcessingStatus>();
  if (status) processingStateByTreeNodeId.set("node-1", status);

  return makeContext({ referenceModelRoot: node, processingStateByTreeNodeId });
}

void test("reference-resolved-check: a node never registered as a candidate produces no finding", async () => {
  const context = contextWithProcessingState(undefined);
  await referenceResolvedCheck.run(context);
  assert.equal(context.findingStore.getSnapshot().length, 0);
});

void test("reference-resolved-check: pending while Resolve has not yet settled", async () => {
  const context = contextWithProcessingState("pending");
  await referenceResolvedCheck.run(context);
  assert.equal(context.findingStore.getSnapshot()[0]?.status, "pending");
});

void test("reference-resolved-check: passed for enriched/verified/stale outcomes", async () => {
  for (const status of ["enriched", "verified", "stale"] as const) {
    const context = contextWithProcessingState(status);
    await referenceResolvedCheck.run(context);
    assert.equal(context.findingStore.getSnapshot()[0]?.status, "passed", `expected passed for ${status}`);
  }
});

void test("reference-resolved-check: warning when unverified", async () => {
  const context = contextWithProcessingState("unverified");
  await referenceResolvedCheck.run(context);
  assert.equal(context.findingStore.getSnapshot()[0]?.status, "warning");
});

void test("reference-resolved-check: error for not-found or failed", async () => {
  for (const status of ["not-found", "failed"] as const) {
    const context = contextWithProcessingState(status);
    await referenceResolvedCheck.run(context);
    assert.equal(context.findingStore.getSnapshot()[0]?.status, "error", `expected error for ${status}`);
  }
});

// --- cache-validation-check (check 3) ---

void test("cache-validation-check: no finding for a node that never had a cache comparison", async () => {
  const context = contextWithProcessingState("enriched");
  await cacheValidationCheck.run(context);
  assert.equal(context.findingStore.getSnapshot().length, 0);
});

void test("cache-validation-check: passed when verified", async () => {
  const context = contextWithProcessingState("verified");
  await cacheValidationCheck.run(context);
  assert.equal(context.findingStore.getSnapshot()[0]?.status, "passed");
});

void test("cache-validation-check: warning when unverified", async () => {
  const context = contextWithProcessingState("unverified");
  await cacheValidationCheck.run(context);
  assert.equal(context.findingStore.getSnapshot()[0]?.status, "warning");
});

void test("cache-validation-check: pending while a stale revision's re-harvest is still in flight", async () => {
  const context = contextWithProcessingState("stale");
  await cacheValidationCheck.run(context);
  assert.equal(context.findingStore.getSnapshot()[0]?.status, "pending");
});

void test("cache-validation-check: passed once a stale revision's re-harvest succeeds", async () => {
  const node = makeItemNode("node-1", makeItem({ scItemId: "id-1" }));
  const processingStateByTreeNodeId = new Map<string, ProcessingStatus>([["node-1", "stale"]]);
  const cacheRevalidationResultByTreeNodeId = new Map<string, "passed" | "error">([["node-1", "passed"]]);
  const context = makeContext({ referenceModelRoot: node, processingStateByTreeNodeId, cacheRevalidationResultByTreeNodeId });

  await cacheValidationCheck.run(context);
  assert.equal(context.findingStore.getSnapshot()[0]?.status, "passed");
});

void test("cache-validation-check: error when a stale revision's re-harvest fails", async () => {
  const node = makeItemNode("node-1", makeItem({ scItemId: "id-1" }));
  const processingStateByTreeNodeId = new Map<string, ProcessingStatus>([["node-1", "stale"]]);
  const cacheRevalidationResultByTreeNodeId = new Map<string, "passed" | "error">([["node-1", "error"]]);
  const context = makeContext({ referenceModelRoot: node, processingStateByTreeNodeId, cacheRevalidationResultByTreeNodeId });

  await cacheValidationCheck.run(context);
  assert.equal(context.findingStore.getSnapshot()[0]?.status, "error");
});
