import { buildFoblesUrl } from "../../features/augmentor/helper";
import { getQuickInfo } from "../../toolbar/jump-flyout/quick-info";
import { factoryItemGraphNodeData, type ItemGraphNodeData } from "../sitecore-harvester.types";
export async function enrichItemGraphNodeData(
    item: ItemGraphNodeData,
    signal: AbortSignal,
    includeTemplate: boolean = true,
): Promise<void> {
    const itemReference = item.scItemId || item.scItemPath;

    if (!itemReference) {
        return;
    }

    item.link ??= buildFoblesUrl(itemReference);

    if (
        item.scItemId &&
        item.scItemName &&
        item.scItemPath &&
        (!includeTemplate || item.scTemplate)
    ) {
        return;
    }

    const response = await fetch(item.link, {
        credentials: "same-origin",
        signal,
    });

    if (!response.ok) {
        return;
    }

    const doc = new DOMParser().parseFromString(
        await response.text(),
        "text/html",
    );

    const quickInfo = getQuickInfo(doc);

    item.scItemId ??= quickInfo.itemId;
    item.scItemName ??= quickInfo.itemName;
    item.scItemPath ??= quickInfo.itemPath;

    if (
        includeTemplate &&
        !item.scTemplate &&
        quickInfo.template?.id
    ) {
        item.scTemplate = factoryItemGraphNodeData({
            scItemId: quickInfo.template.id,
            scItemPath: quickInfo.template.path,
        });
    }
}