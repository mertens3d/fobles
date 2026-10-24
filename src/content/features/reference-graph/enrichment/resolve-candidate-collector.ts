// @source-path [fobles] src/content/features/reference-graph/enrichment/resolve-candidate-collector.ts

import { isItemGraphNodeDataResolved } from "../../../sitecore-harvester/enrichment/item-enricher";
import type { DataTreeNode } from "../data-tree/data-tree.types";

// Item reference -> every treeNodeId representing that same unresolved item.
// Prefer GUID when available; otherwise use the Sitecore path.
// Only items represented in the DataTree become enrichment candidates.
export function collectEnrichmentGuidLookup(dataTree: DataTreeNode): Map<string, string[]> {
  const treeNodeIdsByReference = new Map<string, string[]>();

  collectRecursive(dataTree, treeNodeIdsByReference);

  return treeNodeIdsByReference;
}

function collectRecursive(treeNode: DataTreeNode, treeNodeIdsByReference: Map<string, string[]>): void {
  if (treeNode.nodeType === "item" && !isItemGraphNodeDataResolved(treeNode.scItem)) {
    const reference = treeNode.scItem.scItemId ?? treeNode.scItem.scItemPath;

    if (reference) {
      const referenceKey = reference.toLowerCase();

      const treeNodeIds = treeNodeIdsByReference.get(referenceKey) ?? [];

      treeNodeIds.push(treeNode.treeNodeId);

      treeNodeIdsByReference.set(referenceKey, treeNodeIds);
    }
  }

  treeNode.children.forEach((childTreeNode) => {
    collectRecursive(childTreeNode, treeNodeIdsByReference);
  });
}
