// @source-path [fobles] src/content/shared/reference-model-processing/reference-model-processing-priority.ts

import type { ItemGraphNodeData } from "../../features/reference-model/sitecore-item.types";
import type { ReferenceModelNode } from "../../features/reference-model/reference-model.types";
import { firstItemNode } from "./reference-model-processing-tree-state";
import type { ReferenceModelProcessingPriorityRank } from "./reference-model-processing.types";

export function rankItemForEnrichment(item: ItemGraphNodeData): ReferenceModelProcessingPriorityRank {
  if (!item.scItemName) {
    return 0;
  }

  if (!item.scItemId || !item.scTemplate) {
    return 1;
  }

  return 2;
}

// Stable sort (Array.prototype.sort is spec-guaranteed stable) - ties keep their original
// discovery/enqueue order instead of being reshuffled.
export function sortGuidsByEnrichmentPriority(
  guids: readonly string[],
  guidLookup: Map<string, string[]>,
  nodesById: Map<string, ReferenceModelNode>,
): string[] {
  const rankByGuid = new Map(
    guids.map((guid) => [guid, rankOfGuid(guid, guidLookup, nodesById)] as const),
  );

  return [...guids].sort((a, b) => (rankByGuid.get(a) ?? 0) - (rankByGuid.get(b) ?? 0));
}

function rankOfGuid(
  guid: string,
  guidLookup: Map<string, string[]>,
  nodesById: Map<string, ReferenceModelNode>,
): ReferenceModelProcessingPriorityRank {
  const representative = firstItemNode(guidLookup.get(guid) ?? [], nodesById);

  return representative ? rankItemForEnrichment(representative.scItem) : 0;
}
