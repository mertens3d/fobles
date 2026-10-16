// @source-path [fobles] src/content/features/reference-graph/data-tree/data-tree-node-factory.ts

import type { ItemGraphNodeData } from "../../../sitecore-harvester/sitecore-harvester.types";
import type { GraphCollapseKey } from "../graph-nodes/graph-collapse.types";
import type { DataTreeProvenance } from "./data-tree-provenance.types";
import type {
  DataTreeBranch,
  DataTreeItemNode,
  DataTreeNode,
  DataTreeNonItemNode,
  DataTreeTruncation,
  RelationshipToParent,
} from "./data-tree.types";

type DataTreeNodeOptions = {
  treeNodeId: string;
  kind: DataTreeNode["kind"];
  collapseKey: GraphCollapseKey;
  provenance: DataTreeProvenance;
  branch?: DataTreeBranch;
  relationshipToParent: RelationshipToParent;
  reverse?: boolean;
  truncation?: DataTreeTruncation;
  children?: DataTreeNode[];
};

type DataTreeItemNodeOptions =
  DataTreeNodeOptions & {
    scItem: ItemGraphNodeData;
  };

type DataTreeNonItemNodeOptions =
  DataTreeNodeOptions & {
    name: string;
  };

export function createDataTreeItemNode({
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
}: DataTreeItemNodeOptions): DataTreeItemNode {
  return {
    treeNodeId,
    nodeType: "item",
    scItem,
    kind,
    collapseKey,
    provenance,
    branch,
    relationshipToParent,
    reverse,
    truncation,
    children,
  };
}

export function createDataTreeNonItemNode({
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
}: DataTreeNonItemNodeOptions): DataTreeNonItemNode {
  return {
    treeNodeId,
    nodeType: "nonItem",
    name,
    kind,
    collapseKey,
    provenance,
    branch,
    relationshipToParent,
    reverse,
    truncation,
    children,
  };
}