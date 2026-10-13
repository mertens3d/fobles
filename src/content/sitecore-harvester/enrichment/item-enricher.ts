import { buildFoblesUrl } from "../../features/augmentor/helper";
import { getQuickInfo } from "../../toolbar/jump-flyout/quick-info";
import { factoryItemGraphNodeData, type ItemGraphNodeData } from "../sitecore-harvester.types";
export async function enrichItemGraphNodeData(
    item: ItemGraphNodeData,
    signal: AbortSignal,
    includeTemplate: boolean = true,
): Promise<void> {
    const itemReference = item.itemId || item.path;

    if (!itemReference) {
        return;
    }

    item.link ??= buildFoblesUrl(itemReference);

    if (
        item.itemId &&
        item.name &&
        item.path &&
        (!includeTemplate || item.template)
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

    item.itemId ??= quickInfo.itemId;
    item.name ??= quickInfo.itemName;
    item.path ??= quickInfo.itemPath;

    if (
        includeTemplate &&
        !item.template &&
        quickInfo.template?.id
    ) {
        item.template = factoryItemGraphNodeData();
        item.template.itemId = quickInfo.template.id;
        item.template.path = quickInfo.template.path;
    }
}