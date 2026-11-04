// @source-path [fobles] tests/unit/harvesting/harvest-result-merger.test.ts

import assert from "node:assert/strict";
import { test } from "node:test";
import { createBaseResult, extractRootItem, mergeCollectorResult } from "../../../src/content/foundation/harvesting/coordinator/harvest-result-merger.ts";
import { factoryItemGraphNodeData, type RootItem, type SitecoreHarvestSection } from "../../../src/content/foundation/reference-data/model/sitecore-item.types.ts";
import type { HarvestRequest, SitecoreHarvestResult } from "../../../src/content/foundation/harvesting/sitecore-harvester.types.ts";
import type { WorkerTaskSuccessResult, WorkerTaskType, WorkerTaskPayloadByType } from "../../../src/content/foundation/workers/tasks/worker-task.types.ts";

function rootItem(id: string): RootItem {
  return { ...factoryItemGraphNodeData({ scItemId: id }), scItemId: id };
}

function request(existingResult?: SitecoreHarvestResult): HarvestRequest {
  return {
    requestId: "request-1",
    url: "https://sitecore.example/editor?fo=%7B11111111-2222-3333-4444-555555555555%7D",
    filters: {
      parent: false,
      children: false,
      referrers: false,
      customFields: false,
      standardFields: false,
      layouts: false,
      template: false,
    },
    ...(existingResult ? { existingResult } : {}),
  };
}

function success<TType extends WorkerTaskType>(
  type: TType,
  payload: WorkerTaskPayloadByType[TType],
): Extract<WorkerTaskSuccessResult, { type: TType }> {
  return {
    requestId: "request-1",
    taskId: `task-${type}`,
    type,
    status: "success",
    payload,
  } as Extract<WorkerTaskSuccessResult, { type: TType }>;
}

void test("creates an empty result with only the resolved root item", () => {
  const root = rootItem("root-1");
  const result = createBaseResult(request(), root);

  assert.equal(result.rootItem, root);
  assert.equal(result.parent, undefined);
  assert.equal(result.childItems, undefined);
  assert.equal(result.referrers, undefined);
  assert.equal(result.customFieldSections, undefined);
  assert.equal(result.standardFieldSections, undefined);
  assert.equal(result.layoutSectionFields, undefined);
});

void test("preserves unrequested existing crops while replacing the root item", () => {
  const oldRoot = rootItem("old-root");
  const existing: SitecoreHarvestResult = {
    rootItem: oldRoot,
    parent: undefined,
    childItems: [],
    referrers: undefined,
    customFieldSections: [{ name: "Custom", fields: [] }],
    standardFieldSections: [{ name: "Standard", fields: [] }],
    layoutSectionFields: [{ name: "Layout", devices: [], rawMarkup: undefined }],
  };
  const nextRoot = rootItem("new-root");
  const result = createBaseResult(request(existing), nextRoot);

  assert.notEqual(result, existing);
  assert.equal(result.rootItem, nextRoot);
  assert.equal(result.childItems, existing.childItems);
  assert.equal(result.customFieldSections, existing.customFieldSections);
  assert.equal(result.standardFieldSections, existing.standardFieldSections);
  assert.equal(result.layoutSectionFields, existing.layoutSectionFields);
});

void test("merges each collector task only into the result field it owns", () => {
  const result = createBaseResult(request(), rootItem("root"));
  const parent = factoryItemGraphNodeData({ scItemId: "parent" });
  const child = factoryItemGraphNodeData({ scItemId: "child" });
  const referrer = factoryItemGraphNodeData({ scItemId: "referrer" });
  const customSections: readonly SitecoreHarvestSection[] = [{ name: "Custom", fields: [] }];
  const standardSections: readonly SitecoreHarvestSection[] = [{ name: "Standard", fields: [] }];
  const layoutFields = [{ name: "Layout", devices: [], rawMarkup: undefined }];

  mergeCollectorResult(result, success("get-parent", { parent }));
  assert.equal(result.parent, parent);
  mergeCollectorResult(result, success("get-children", { childItems: [child] }));
  assert.deepEqual(result.childItems, [child]);
  mergeCollectorResult(result, success("get-referrers", { referrers: [referrer] }));
  assert.deepEqual(result.referrers, [referrer]);
  mergeCollectorResult(result, success("get-custom-fields", { sections: customSections }));
  assert.equal(result.customFieldSections, customSections);
  assert.equal(result.standardFieldSections, undefined);
  mergeCollectorResult(result, success("get-standard-fields", { sections: standardSections }));
  assert.equal(result.standardFieldSections, standardSections);
  mergeCollectorResult(result, success("get-layout", { layoutSectionFields: layoutFields }));
  assert.equal(result.layoutSectionFields, layoutFields);
});

void test("quick-info and editor-state task results do not mutate collector data", () => {
  const result = createBaseResult(request(), rootItem("root"));
  const before = { ...result };

  mergeCollectorResult(result, success("get-quick-info", {
    result: { requested: { kind: "id", value: "root" }, status: "not-found" },
  }));
  mergeCollectorResult(result, success("set-raw-values", { value: false }));
  mergeCollectorResult(result, success("set-standard-fields", { value: true }));

  assert.deepEqual(result, before);
});

void test("extracts root only from a found Quick Info result for new harvests", () => {
  const requestWithoutExisting = request();
  const root = rootItem("root-found");
  const found = success("get-quick-info", {
    result: {
      requested: { kind: "id", value: "root-found" },
      resolved: { itemId: "root-found", path: "/sitecore/content/root-found" },
      value: root,
      status: "found",
    },
  });
  const notFound = success("get-quick-info", {
    result: { requested: { kind: "id", value: "missing" }, status: "not-found" },
  });

  assert.deepEqual(extractRootItem(requestWithoutExisting, [found]), root);
  assert.equal(extractRootItem(requestWithoutExisting, [notFound]), undefined);
  assert.equal(extractRootItem(requestWithoutExisting, []), undefined);
});

void test("uses the existing root when refreshing an existing result", () => {
  const existingRoot = rootItem("existing-root");
  const existing = { ...createBaseResult(request(), existingRoot) };
  const requestWithExisting = request(existing);
  const otherRoot = rootItem("other-root");
  const unrelatedQuickInfo = success("get-quick-info", {
    result: {
      requested: { kind: "id", value: "other-root" },
      resolved: { itemId: "other-root" },
      value: otherRoot,
      status: "found",
    },
  });

  assert.equal(extractRootItem(requestWithExisting, [unrelatedQuickInfo]), existingRoot);
});
