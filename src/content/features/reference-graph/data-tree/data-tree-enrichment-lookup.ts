// @source-path [fobles] src/content/features/reference-graph/data-tree/data-tree-enrichment-lookup.ts

import { isItemGraphNodeDataResolved } from "../../../sitecore-harvester/enrichment/item-enricher";
import type { DataTreeNode } from "./data-tree.types";

// Unique Sitecore GUID -> every treeNodeId representing that same item, for item nodes that are
// GUID-backed (scItemId) but not yet fully resolved. Only GUIDs actually represented in the
// DataTree become enrichment candidates - this is the sole source of that candidate set.
export function collectEnrichmentGuidLookup(
  dataTree: DataTreeNode,
): Map<string, string[]> {
  const treeNodeIdsByGuid = new Map<string, string[]>();

  collectRecursive(dataTree, treeNodeIdsByGuid);

  return treeNodeIdsByGuid;
}

function collectRecursive(
  treeNode: DataTreeNode,
  treeNodeIdsByGuid: Map<string, string[]>,
): void {
  if (
    treeNode.nodeType === "item" &&
    treeNode.scItem.scItemId &&
    !isItemGraphNodeDataResolved(treeNode.scItem)
  ) {
    const guidKey = treeNode.scItem.scItemId.toLowerCase();
    const treeNodeIds = treeNodeIdsByGuid.get(guidKey) ?? [];

    treeNodeIds.push(treeNode.treeNodeId);
    treeNodeIdsByGuid.set(guidKey, treeNodeIds);
  }

  treeNode.children.forEach((childTreeNode) => {
    collectRecursive(childTreeNode, treeNodeIdsByGuid);
  });
}
