// @source-path [fobles] src/content/shared/reference-model-processing/resolve-candidate-collector.ts

import { stripGuidBraces } from "../../features/augmentor/shared/guid.ts";
import { isItemGraphNodeDataResolved } from "../../foundation/harvesting/enrichment/item-enricher.ts";
import type { ReferenceModelNode } from "../../foundation/reference-data/model/reference-model.types";

// Item reference -> every treeNodeId representing that same unresolved item.
// Prefer GUID when available; otherwise use the Sitecore path.
// Only items represented in the ReferenceModel become enrichment candidates.
export function collectEnrichmentGuidLookup(referenceModel: ReferenceModelNode): Map<string, string[]> {
  const treeNodeIdsByReference = new Map<string, string[]>();

  collectRecursive(referenceModel, treeNodeIdsByReference);

  return treeNodeIdsByReference;
}

// Bracketed and unbracketed spellings of the same GUID (e.g. a rendering parameter value vs a
// layout XML attribute) must collapse to one lookup entry - otherwise the same underlying item
// is scheduled for Resolve twice under two different keys.
function normalizeReferenceKey(reference: string): string {
  return stripGuidBraces(reference).toLowerCase();
}

function collectRecursive(treeNode: ReferenceModelNode, treeNodeIdsByReference: Map<string, string[]>): void {
  if (treeNode.nodeType === "item" && !isItemGraphNodeDataResolved(treeNode.scItem)) {
    const reference = treeNode.scItem.scItemId ?? treeNode.scItem.scItemPath;

    if (reference) {
      const referenceKey = normalizeReferenceKey(reference);

      const treeNodeIds = treeNodeIdsByReference.get(referenceKey) ?? [];

      treeNodeIds.push(treeNode.treeNodeId);

      treeNodeIdsByReference.set(referenceKey, treeNodeIds);
    }
  }

  treeNode.children.forEach((childTreeNode) => {
    collectRecursive(childTreeNode, treeNodeIdsByReference);
  });
}

// Re-checked right before a guid's Resolve attempt actually runs (not just at collection time) -
// a shared ItemGraphNodeData object instance (e.g. a page-layout item reused across devices) can
// become fully resolved via a DIFFERENT guid's merge before this guid's own turn comes up in a
// concurrent Resolve batch. Reference Graph and Auditor must both honor this, not just Auditor.
export function isEligibleForResolve(treeNodeIds: readonly string[], nodesById: ReadonlyMap<string, ReferenceModelNode>): boolean {
  return treeNodeIds.some((treeNodeId) => {
    const node = nodesById.get(treeNodeId);
    return node?.nodeType === "item" && !isItemGraphNodeDataResolved(node.scItem);
  });
}
