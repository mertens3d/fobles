import type { NodeKind } from "../../../../constants/_base/_REFERENCE_GRAPH_BASE";
import type { ItemGraphNodeData } from "../../../sitecore-harvester/sitecore-harvester.types";

export type RelationshipToParent = "contained" | "related";

export type DataTreeBranch =
  | "parent"
  | "children"
  | "layouts"
  | "referrers"
  | "sections"
  | "template";


export type TreeChildNode = {
  name: string | undefined;
  itemId: string;
};

type DataTreeNodeBase = {
  treeNodeId: string;
  kind: NodeKind;
  branch?: DataTreeBranch;
  relationshipToParent?: RelationshipToParent;
  reverse?: boolean;
  children: DataTreeNode[];
};

export type DataTreeItemNode = DataTreeNodeBase & {
  nodeType: "item";
  scItem: ItemGraphNodeData;
};

export type DataTreeNonItemNode = DataTreeNodeBase & {
  nodeType: "nonItem";
  name: string;
};

export type DataTreeNode =
  | DataTreeItemNode
  | DataTreeNonItemNode;