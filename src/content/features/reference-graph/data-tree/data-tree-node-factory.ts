// @source-path [fobles] src/content/features/reference-graph/data-tree/data-tree-node-factory.ts

import type { ItemGraphNodeData } from "../../../sitecore-harvester/sitecore-harvester.types";
import type { GraphCollapseKey } from "../graph-nodes/graph-collapse.types";
import type {
  DataTreeBranch,
  DataTreeItemNode,
  DataTreeNode,
  DataTreeNonItemNode,
  RelationshipToParent,
} from "./data-tree.types";

type DataTreeNodeOptions = {
  treeNodeId: string;
  kind: DataTreeNode["kind"];
  collapseKey: GraphCollapseKey;
  branch?: DataTreeBranch;
  relationshipToParent: RelationshipToParent;
  reverse?: boolean;
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
  branch,
  relationshipToParent,
  reverse,
  children = [],
  scItem,
}: DataTreeItemNodeOptions): DataTreeItemNode {
  return {
    treeNodeId,
    nodeType: "item",
    scItem,
    kind,
    collapseKey,
    branch,
    relationshipToParent,
    reverse,
    children,
  };
}

export function createDataTreeNonItemNode({
  treeNodeId,
  kind,
  collapseKey,
  branch,
  relationshipToParent,
  reverse,
  children = [],
  name,
}: DataTreeNonItemNodeOptions): DataTreeNonItemNode {
  return {
    treeNodeId,
    nodeType: "nonItem",
    name,
    kind,
    collapseKey,
    branch,
    relationshipToParent,
    reverse,
    children,
  };
}