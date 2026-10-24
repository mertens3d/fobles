// @source-path [fobles] src/content/features/reference-graph/reference-model/reference-model-node-factory.ts

import { CONST } from "../../../constants/const";
import type { ItemGraphNodeData } from "./sitecore-item.types";
import { GRAPH_COLLAPSE_KEY, type GraphCollapseKey } from "../reference-graph/graph-nodes/graph-collapse.types";
import type { ReferenceModelProvenance } from "./reference-model-provenance.types";
import type {
  ReferenceModelBranch,
  ReferenceModelItemNode,
  ReferenceModelNode,
  ReferenceModelNonItemNode,
  ReferenceModelTruncation,
  RelationshipToParent,
} from "./reference-model.types";
import { createReferenceModelNodeId } from "./layout-reference-model-builder";
import type { PlaceholderTreeNode } from "./reference-model.types";
import { setGraphPresentationState } from "../reference-graph/graph-nodes/graph-presentation-state";
import { createRenderingReferenceModelNode } from "./rendering-reference-model-builder";
import type { NodeKind } from "../../../constants/_base/_REFERENCE_GRAPH_BASE";

type ReferenceModelNodeOptions = {
  treeNodeId: string;
  kind: NodeKind;
  collapseKey: GraphCollapseKey;
  provenance: ReferenceModelProvenance;
  branch?: ReferenceModelBranch;
  relationshipToParent: RelationshipToParent;
  reverse?: boolean;
  truncation?: ReferenceModelTruncation;
  children?: ReferenceModelNode[];
};

type ReferenceModelItemNodeOptions =
  ReferenceModelNodeOptions & {
    scItem: ItemGraphNodeData;
  };

type ReferenceModelNonItemNodeOptions =
  ReferenceModelNodeOptions & {
    name: string;
  };

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