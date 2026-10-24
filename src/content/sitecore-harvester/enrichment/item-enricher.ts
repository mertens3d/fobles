// @source-path [fobles] src/content/sitecore-harvester/enrichment/item-enricher.ts

import { getQuickInfo } from "../../toolbar/jump-flyout/quick-info";
import { factoryItemGraphNodeData, type ItemGraphNodeData } from "../sitecore-harvester.types";

export function isItemGraphNodeDataResolved(item: ItemGraphNodeData): boolean {
    return Boolean(item.scItemId && item.scItemName && item.scItemPath && item.scTemplate);
}

// The item header icon's own `rev=` query param is Sitecore's per-item revision GUID - the
// cheapest signal available for "has this item changed since it was cached".
export function extractRevisionFromIconUrl(iconUrl: string | undefined): string | undefined {
    if (!iconUrl) return undefined;

    try {
        return new URL(iconUrl).searchParams.get("rev") ?? undefined;
    } catch {
        return undefined;
    }
}

// Pure read of an already-loaded Quick Info document.
// Used by the worker task executor for get-quick-info.
// task calls this directly, since its worker tab is already navigated to item.link by the time
// its task runs (no fetch needed here).
export function buildItemGraphNodeDataFromDoc(doc: Document): ItemGraphNodeData {
    const quickInfo = getQuickInfo(doc);

    return factoryItemGraphNodeData({
        scItemId: quickInfo.itemId,
        scItemName: quickInfo.itemName,
        scItemPath: quickInfo.itemPath,
        scItemIcon: quickInfo.icon,
        rawMarkup: quickInfo.rawMarkup,
        scTemplate: quickInfo.template?.id
            ? factoryItemGraphNodeData({
                scItemId: quickInfo.template.id,
                scItemPath: quickInfo.template.path,
            })
            : undefined,
    });
}
