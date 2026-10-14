import type { ItemGraphNodeData } from "../../../sitecore-harvester/sitecore-harvester.types";
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
  branch?: DataTreeBranch;
  relationshipToParent?: RelationshipToParent;
  reverse?: boolean;
  children?: DataTreeNode[];
};

type DataTreeItemNodeOptions = DataTreeNodeOptions & {
  scItem: ItemGraphNodeData;
};

type DataTreeNonItemNodeOptions = DataTreeNodeOptions & {
  name: string;
};

export function createDataTreeItemNode({
  treeNodeId,
  kind,
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
    branch,
    relationshipToParent,
    reverse,
    children,
  };
}

export function createDataTreeNonItemNode({
  treeNodeId,
  kind,
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
    branch,
    relationshipToParent,
    reverse,
    children,
  };
}