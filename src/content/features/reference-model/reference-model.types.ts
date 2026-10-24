import type { ItemGraphNodeData, ScControl } from "./sitecore-item.types";
import type { ReferenceModelProvenance } from "./reference-model-provenance.types";

export type RelationshipToParent = "contained" | "related";

export type ReferenceModelBranch = "parent" | "children" | "layouts" | "referrers" | "customFields" | "standardFields" | "template";

// Fan-out truncation metadata for a wrapper node (e.g. Children/Referrers) whose underlying
// relationship may be larger than what the ReferenceModel actually includes as children.
export type ReferenceModelTruncation = { availableCount: number; includedCount: number; truncated: boolean };

type ReferenceModelNodeBase = {
  treeNodeId: string;
  provenance: ReferenceModelProvenance;
  truncation?: ReferenceModelTruncation;
  children: ReferenceModelNode[];
};

export type ReferenceModelItemNode = ReferenceModelNodeBase & {
  nodeType: "item";
  scItem: ItemGraphNodeData;
};

export type ReferenceModelNonItemNode = ReferenceModelNodeBase & { nodeType: "nonItem"; name: string };

export type ReferenceModelNode = ReferenceModelItemNode | ReferenceModelNonItemNode;
export type PlaceholderTreeNode = { path: string; placeholders: PlaceholderTreeNode[]; controls: ScControl[] };
