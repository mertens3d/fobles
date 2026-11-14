// @source-path [fobles] src/content/foundation/reference-data/processing/processor/reference-model-processing-snapshot.ts

import type { ItemSnapshot } from "../processing.types.ts";
import type { ItemGraphNodeData } from "../../model/model.types.ts";

export function snapshotOf(item: ItemGraphNodeData): ItemSnapshot {
  return {
    scItemId: item.scItemId,
    scItemName: item.scItemName,
    scItemPath: item.scItemPath,
    scTemplate: item.scTemplate,
    scItemIcon: item.scItemIcon,
    rawMarkup: item.rawMarkup,
    link: item.link,
  };
}
