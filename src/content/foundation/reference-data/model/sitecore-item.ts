// @source-path [fobles] src/content/foundation/reference-data/model/sitecore-item.ts

import type { ItemGraphNodeData } from "./model.types.js";
export function factoryItemGraphNodeData(overrides: Partial<Omit<ItemGraphNodeData, "type">> = {}): ItemGraphNodeData {
  return {
    type: "scItem",
    scItemName: undefined,
    scItemId: undefined,
    link: undefined,
    scItemPath: undefined,
    scTemplate: undefined,
    scItemIcon: undefined,
    rawMarkup: undefined,
    facts: {},
    ...overrides,
  };
}
