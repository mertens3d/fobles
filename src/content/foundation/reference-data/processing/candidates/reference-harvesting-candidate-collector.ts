// @source-path [fobles] src/content/foundation/reference-data/processing/candidates/reference-harvesting-candidate-collector.ts

import { stripGuidBraces } from "../../../sitecore/guid.ts";
import { isItemGraphNodeDataResolved } from "../../../harvesting/enrichment/item-enricher.ts";
import type { ReferenceModelNode } from "../../model/model.types.ts";

// Agent: Item reference -> every treeNodeId representing that same unresolved item.
// Agent: Prefer GUID when available; otherwise use the Sitecore path.
// Agent: Only items represented in the ReferenceModel become enrichment candidates.
export function collectReferenceHarvestingCandidateLookup(referenceModel: ReferenceModelNode): Map<string, string[]> {
  const treeNodeIdsByReference = new Map<string, string[]>();

  collectRecursive(referenceModel, treeNodeIdsByReference);

  return treeNodeIdsByReference;
}

// Agent: Bracketed and unbracketed spellings of the same GUID (e.g. a rendering parameter value vs a
// Agent: layout XML attribute) must collapse to one lookup entry - otherwise the same underlying item
// Agent: is scheduled for Reference Harvesting twice under two different keys.
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

// Agent: Re-checked right before a guid's Reference Harvesting attempt actually runs (not just at collection time) -
// Agent: a shared ItemGraphNodeData object instance (e.g. a page-layout item reused across devices) can
// Agent: become fully harvested via a DIFFERENT guid's merge before this guid's own turn comes up in a
// Agent: concurrent Reference Harvesting batch. Reference Graph and Auditor must both honor this, not just Auditor.
export function isEligibleForReferenceHarvesting(
  treeNodeIds: readonly string[],
  nodesById: ReadonlyMap<string, ReferenceModelNode>,
): boolean {
  return treeNodeIds.some((treeNodeId) => {
    const node = nodesById.get(treeNodeId);
    return node?.nodeType === "item" && !isItemGraphNodeDataResolved(node.scItem);
  });
}
