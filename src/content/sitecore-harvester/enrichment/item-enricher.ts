// @source-path [fobles] src/content/sitecore-harvester/enrichment/item-enricher.ts

import { getQuickInfo } from "../../toolbar/jump-flyout/quick-info";
import { factoryItemGraphNodeData, type ItemGraphNodeData } from "../sitecore-harvester.types";

export function isItemGraphNodeDataResolved(item: ItemGraphNodeData): boolean {
    return Boolean(item.scItemId && item.scItemName && item.scItemPath && item.scTemplate);
}

// Pure read of an already-loaded quick-info document - the worker-pool task executor's enrich-item
// task calls this directly, since its worker tab is already navigated to item.link by the time
// its task runs (no fetch needed here).
export function buildItemGraphNodeDataFromDoc(doc: Document): ItemGraphNodeData {
    const quickInfo = getQuickInfo(doc);

    return factoryItemGraphNodeData({
        scItemId: quickInfo.itemId,
        scItemName: quickInfo.itemName,
        scItemPath: quickInfo.itemPath,
        scTemplate: quickInfo.template?.id
            ? factoryItemGraphNodeData({
                scItemId: quickInfo.template.id,
                scItemPath: quickInfo.template.path,
            })
            : undefined,
    });
}
