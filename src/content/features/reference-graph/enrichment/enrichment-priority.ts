// @source-path [fobles] src/content/features/reference-graph/enrichment/enrichment-priority.ts

import type { ItemGraphNodeData } from "../../reference-model/sitecore-item.types";
import type { ReferenceModelNode } from "../../reference-model/reference-model.types";
import { firstItemNode } from "./enrichment-tree-state";
import type { EnrichmentPriorityRank } from "./enrichment.types";

export function rankItemForEnrichment(item: ItemGraphNodeData): EnrichmentPriorityRank {
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
): EnrichmentPriorityRank {
  const representative = firstItemNode(guidLookup.get(guid) ?? [], nodesById);

  return representative ? rankItemForEnrichment(representative.scItem) : 0;
}
