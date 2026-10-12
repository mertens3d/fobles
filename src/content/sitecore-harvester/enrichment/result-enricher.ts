import type {
    ItemGraphNodeData,
    SitecoreHarvestResult,
} from "../sitecore-harvester.types";
import { enrichItemGraphNodeData } from "./item-enricher";

export async function enrichSitecoreHarvestResult(
    result: SitecoreHarvestResult,
    signal: AbortSignal,
): Promise<void> {
    const items = collectItemGraphNodeData(result);
    const enrichedItemsByReference =
        new Map<string, ItemGraphNodeData>();

    for (const item of items) {
        await enrichItemWithCache(
            item,
            signal,
            enrichedItemsByReference,
            true,
        );

        if (item.template) {
            await enrichItemWithCache(
                item.template,
                signal,
                enrichedItemsByReference,
                false,
            );
        }
    }
}

async function enrichItemWithCache(
    item: ItemGraphNodeData,
    signal: AbortSignal,
    enrichedItemsByReference: Map<
        string,
        ItemGraphNodeData
    >,
    includeTemplate: boolean,
): Promise<void> {
    const itemReference = item.itemId || item.path;

    if (!itemReference) {
        return;
    }

    const cachedItem =
        enrichedItemsByReference.get(
            itemReference.toLowerCase(),
        );

    if (cachedItem) {
        mergeItemGraphNodeData(
            item,
            cachedItem,
            includeTemplate,
        );

        return;
    }

    await enrichItemGraphNodeData(
        item,
        signal,
        includeTemplate,
    );

    if (item.itemId) {
        enrichedItemsByReference.set(
            item.itemId.toLowerCase(),
            item,
        );
    }

    if (item.path) {
        enrichedItemsByReference.set(
            item.path.toLowerCase(),
            item,
        );
    }
}

function collectItemGraphNodeData(
    value: unknown,
): ItemGraphNodeData[] {
    const items: ItemGraphNodeData[] = [];
    const visited = new WeakSet<object>();

    collectItemGraphNodeDataRecursive(
        value,
        items,
        visited,
    );

    return items;
}

function collectItemGraphNodeDataRecursive(
    value: unknown,
    items: ItemGraphNodeData[],
    visited: WeakSet<object>,
): void {
    if (
        typeof value !== "object" ||
        value === null ||
        visited.has(value)
    ) {
        return;
    }

    visited.add(value);

    if (isItemGraphNodeData(value)) {
        items.push(value);

        // Do not recurse into value.template here.
        // Its metadata is enriched exactly once by
        // enrichSitecoreHarvestResult().
        return;
    }

    if (Array.isArray(value)) {
        for (const item of value) {
            collectItemGraphNodeDataRecursive(
                item,
                items,
                visited,
            );
        }

        return;
    }

    for (const propertyValue of Object.values(value)) {
        collectItemGraphNodeDataRecursive(
            propertyValue,
            items,
            visited,
        );
    }
}

function isItemGraphNodeData(
    value: object,
): value is ItemGraphNodeData {
    return (
        "type" in value &&
        value.type === "scItem"
    );
}

function mergeItemGraphNodeData(
    target: ItemGraphNodeData,
    source: ItemGraphNodeData,
    includeTemplate: boolean,
): void {
    target.itemId ??= source.itemId;
    target.name ??= source.name;
    target.path ??= source.path;
    target.link ??= source.link;

    if (includeTemplate) {
        target.template ??= source.template;
    }
}