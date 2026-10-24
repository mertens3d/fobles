import type { NodeKind } from "../../../../constants/_base/_REFERENCE_GRAPH_BASE";
import type { ItemGraphNodeData, ScControl } from "../../../sitecore-harvester/sitecore-harvester.types";
import type { GraphCollapseKey } from "../graph-nodes/graph-collapse.types";
import type { DataTreeProvenance } from "./data-tree-provenance.types";

export type RelationshipToParent = "contained" | "related";

export type DataTreeBranch = "parent" | "children" | "layouts" | "referrers" | "customFields" | "standardFields" | "template";

// Fan-out truncation metadata for a wrapper node (e.g. Children/Referrers) whose underlying
// relationship may be larger than what the DataTree actually includes as children.
export type DataTreeTruncation = { availableCount: number; includedCount: number; truncated: boolean };

// pending = GUID discovered, no attempt yet. enriching = request in progress. enriched = item
// found, no prior cache. verified = cached revision matched the live read. stale = cached
// revision no longer matches (a re-harvest may be queued). unverified = the live read could not
// supply a revision at all (never conflated with "stale" - there's nothing to compare against).
// not-found = attempt completed but the item doesn't exist. failed = technical failure. Never
// inferred from missing fields - only ever set explicitly by the enrichment/resolve controller.
export type EnrichmentStatus = "pending" | "enriching" | "enriched" | "verified" | "stale" | "unverified" | "not-found" | "failed";

type DataTreeNodeBase = {
  treeNodeId: string;
  kind: NodeKind;
  collapseKey: GraphCollapseKey;
  provenance: DataTreeProvenance;
  branch?: DataTreeBranch;
  relationshipToParent?: RelationshipToParent;
  reverse?: boolean;
  truncation?: DataTreeTruncation;
  children: DataTreeNode[];
};

export type DataTreeItemNode = DataTreeNodeBase & {
  nodeType: "item";
  scItem: ItemGraphNodeData;
  // GUID-backed enrichment status - undefined for item nodes that were never enrichment
  // candidates (e.g. already fully resolved at harvest time).
  enrichmentStatus?: EnrichmentStatus;
};

export type DataTreeNonItemNode = DataTreeNodeBase & { nodeType: "nonItem"; name: string };

export type DataTreeNode = DataTreeItemNode | DataTreeNonItemNode;
export type PlaceholderTreeNode = { path: string; placeholders: PlaceholderTreeNode[]; controls: ScControl[] };
