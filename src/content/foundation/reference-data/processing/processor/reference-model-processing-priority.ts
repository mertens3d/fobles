// @source-path [fobles] src/content/foundation/reference-data/processing/processor/reference-model-processing-priority.ts

import type { ItemGraphNodeData } from "../../model/model.types.ts";
import type { ReferenceModelNode } from "../../model/model.types.ts";
import { firstItemNode } from "./reference-model-processing-tree-state.ts";
import type { ReferenceModelProcessingPriorityRank } from "../processing.types.ts";

export function rankItemForEnrichment(item: ItemGraphNodeData): ReferenceModelProcessingPriorityRank {
  if (!item.scItemName) {
    return 0;
  }

  if (!item.scItemId || !item.scTemplate) {
    return 1;
  }

  return 2;
}

// Agent: Stable sort (Array.prototype.sort is spec-guaranteed stable) - ties keep their original
// Agent: discovery/enqueue order instead of being reshuffled.
export function sortGuidsByEnrichmentPriority(
  guids: readonly string[],
  guidLookup: Map<string, string[]>,
  nodesById: Map<string, ReferenceModelNode>,
): string[] {
  const rankByGuid = new Map(guids.map((guid) => [guid, rankOfGuid(guid, guidLookup, nodesById)] as const));

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
