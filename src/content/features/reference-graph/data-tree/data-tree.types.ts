import type { NodeKind } from "../../../../constants/_base/_REFERENCE_GRAPH_BASE";
import type { ItemGraphNodeData, ScControl } from "../../../sitecore-harvester/sitecore-harvester.types";
import type { DataTreeProvenance } from "./data-tree-provenance.types";

export type RelationshipToParent = "contained" | "related";

export type DataTreeBranch = "parent" | "children" | "layouts" | "referrers" | "customFields" | "standardFields" | "template";

// Fan-out truncation metadata for a wrapper node (e.g. Children/Referrers) whose underlying
// relationship may be larger than what the DataTree actually includes as children.
export type DataTreeTruncation = { availableCount: number; includedCount: number; truncated: boolean };

type DataTreeNodeBase = {
  treeNodeId: string;
  kind: NodeKind;
  provenance: DataTreeProvenance;
  relationshipToParent?: RelationshipToParent;
  reverse?: boolean;
  truncation?: DataTreeTruncation;
  children: DataTreeNode[];
};

export type DataTreeItemNode = DataTreeNodeBase & {
  nodeType: "item";
  scItem: ItemGraphNodeData;
};

export type DataTreeNonItemNode = DataTreeNodeBase & { nodeType: "nonItem"; name: string };

export type DataTreeNode = DataTreeItemNode | DataTreeNonItemNode;
export type PlaceholderTreeNode = { path: string; placeholders: PlaceholderTreeNode[]; controls: ScControl[] };
