// @source-path [Fobles] src/content/foundation/reference-data/model/reference-model-node-factory.ts

import type { ReferenceModelItemNodeOptions, ReferenceModelNonItemNodeOptions } from "./model.types";
import { setGraphPresentationState } from "./graph-presentation-state";
import type { ReferenceModelItemNode, ReferenceModelNonItemNode } from "./model.types";

export function createReferenceModelItemNode({
  treeNodeId,
  kind,
  collapseKey,
  provenance,
  branch,
  relationshipToParent,
  reverse,
  truncation,
  children = [],
  scItem,
}: ReferenceModelItemNodeOptions): ReferenceModelItemNode {
  const node: ReferenceModelItemNode = { treeNodeId, nodeType: "item", scItem, provenance, truncation, children };
  setGraphPresentationState(node, { kind, collapseKey, branch, relationshipToParent, reverse });
  return node;
}

export function createReferenceModelNonItemNode({
  treeNodeId,
  kind,
  collapseKey,
  provenance,
  branch,
  relationshipToParent,
  reverse,
  truncation,
  children = [],
  name,
}: ReferenceModelNonItemNodeOptions): ReferenceModelNonItemNode {
  const node: ReferenceModelNonItemNode = { treeNodeId, nodeType: "nonItem", name, provenance, truncation, children };
  setGraphPresentationState(node, { kind, collapseKey, branch, relationshipToParent, reverse });
  return node;
}
