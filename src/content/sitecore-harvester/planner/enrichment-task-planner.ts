// @source-path [fobles] src/content/sitecore-harvester/planner/enrichment-task-planner.ts

import { buildFoblesUrl } from "../../features/augmentor/helper";
import type { ItemGraphNodeData } from "../sitecore-harvester.types";

// Merges one worker-resolved ItemGraphNodeData into every ItemGraphNodeData object sharing its
// lookup key, preserving whatever each individual location already had populated.
export function mergeEnrichedItem(
  groups: Map<string, ItemGraphNodeData[]>,
  lookupKey: string,
  enriched: ItemGraphNodeData,
): void {
  const items = groups.get(lookupKey) ?? [];

  for (const item of items) {
    item.scItemId ??= enriched.scItemId;
    item.scItemName ??= enriched.scItemName;
    item.scItemPath ??= enriched.scItemPath;
    item.scTemplate ??= enriched.scTemplate;
    item.scItemIcon ??= enriched.scItemIcon;
    item.rawMarkup ??= enriched.rawMarkup;

    const itemReference = item.scItemId || item.scItemPath;
    if (itemReference) {
      item.link ??= buildFoblesUrl(itemReference);
    }
  }
}
