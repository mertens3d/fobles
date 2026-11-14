// @source-path [fobles] tests/unit/reference-graph-enrichment/reference-harvesting-candidate-collector.test.ts

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  collectReferenceHarvestingCandidateLookup,
  isEligibleForReferenceHarvesting,
} from "../../../src/content/foundation/reference-data/processing/candidates/reference-harvesting-candidate-collector.ts";
import type {
  ItemGraphNodeData,
  ReferenceModelNode,
  ReferenceModelItemNode,
} from "../../../src/content/foundation/reference-data/model/model.types.ts";

const FIELD_NAMES_GUID = "96E5F4BA-A2CF-4A4C-A4E7-64DA88226362";

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

function makeItemNode(
  treeNodeId: string,
  item: ItemGraphNodeData,
  children: ReferenceModelNode[] = [],
): ReferenceModelItemNode {
  return { treeNodeId, nodeType: "item", scItem: item, provenance: { type: "synthetic", label: treeNodeId }, children };
}

function nodesById(nodes: readonly ReferenceModelItemNode[]): Map<string, ReferenceModelNode> {
  return new Map(nodes.map((node) => [node.treeNodeId, node]));
}

void test("a fully harvested Reference Model item is excluded from the guid lookup entirely", () => {
  const resolved = makeItemNode(
    "resolved-node",
    makeItem({
      scItemId: "11111111-1111-1111-1111-111111111111",
      scItemName: "JSS Layout",
      scItemPath: "/sitecore/layout/renderings/JSS Layout",
      scTemplate: makeItem({ scItemName: "Layout" }),
    }),
  );
  const root = makeItemNode("root", makeItem(), [resolved]);

  assert.equal(collectReferenceHarvestingCandidateLookup(root).size, 0);
});

void test("an unresolved item-reference node (e.g. a rendering-parameter GUID like FieldNames) is still a Reference Harvesting candidate", () => {
  const unresolved = makeItemNode("field-names-node", makeItem({ scItemId: `{${FIELD_NAMES_GUID}}` }));
  const root = makeItemNode("root", makeItem(), [unresolved]);

  const guidLookup = collectReferenceHarvestingCandidateLookup(root);
  assert.equal(guidLookup.size, 1);
  assert.deepEqual(Array.from(guidLookup.values())[0], ["field-names-node"]);
});

void test("bracketed and unbracketed spellings of the same GUID collapse into one lookup entry", () => {
  const bracketed = makeItemNode("bracketed-node", makeItem({ scItemId: `{${FIELD_NAMES_GUID}}` }));
  const unbracketed = makeItemNode("unbracketed-node", makeItem({ scItemId: FIELD_NAMES_GUID.toLowerCase() }));
  const root = makeItemNode("root", makeItem(), [bracketed, unbracketed]);

  const guidLookup = collectReferenceHarvestingCandidateLookup(root);
  assert.equal(guidLookup.size, 1);
  assert.deepEqual(Array.from(guidLookup.values())[0]?.sort(), ["bracketed-node", "unbracketed-node"]);
});

void test("isEligibleForReferenceHarvesting is false once every node sharing a guid has become fully harvested", () => {
  const resolvedItem = makeItem({
    scItemId: "22222222-2222-2222-2222-222222222222",
    scItemName: "Default device",
    scItemPath: "/sitecore/layout/devices/Default",
    scTemplate: makeItem({ scItemName: "Device" }),
  });
  const node = makeItemNode("device-node", resolvedItem);

  assert.equal(isEligibleForReferenceHarvesting(["device-node"], nodesById([node])), false);
});

void test("isEligibleForReferenceHarvesting stays true while at least one sharing node is still unresolved", () => {
  const resolvedNode = makeItemNode(
    "resolved-node",
    makeItem({
      scItemId: "33333333-3333-3333-3333-333333333333",
      scItemName: "Default device",
      scItemPath: "/sitecore/layout/devices/Default",
      scTemplate: makeItem({ scItemName: "Device" }),
    }),
  );
  const unresolvedNode = makeItemNode(
    "unresolved-node",
    makeItem({ scItemId: "33333333-3333-3333-3333-333333333333" }),
  );

  assert.equal(
    isEligibleForReferenceHarvesting(["resolved-node", "unresolved-node"], nodesById([resolvedNode, unresolvedNode])),
    true,
  );
});

void test("isEligibleForReferenceHarvesting is false for an empty/unknown treeNodeId list (nothing left to resolve)", () => {
  assert.equal(isEligibleForReferenceHarvesting([], new Map()), false);
});
