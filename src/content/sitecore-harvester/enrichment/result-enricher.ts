// @source-path [fobles] src/content/sitecore-harvester/enrichment/result-enricher.ts

import type {
    ItemGraphNodeData,
    SitecoreHarvestResult,
} from "../sitecore-harvester.types";
import { enrichItemGraphNodeData } from "./item-enricher";

export async function enrichSitecoreHarvestResult(
  result: SitecoreHarvestResult,
  signal: AbortSignal,
  onProgress?: (current: number, total: number) => void,
): Promise<void> {
  const items = collectItemGraphNodeData(result);
  const enrichedItemsByReference =
    new Map<string, ItemGraphNodeData>();

  let current = 0;

  onProgress?.(current, items.length);

  for (const item of items) {
    await enrichItemWithCache(
      item,
      signal,
      enrichedItemsByReference,
      true,
    );

    if (item.scTemplate) {
      await enrichItemWithCache(
        item.scTemplate,
        signal,
        enrichedItemsByReference,
        false,
      );
    }

    current += 1;
    onProgress?.(current, items.length);
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
    const itemReference = item.scItemId || item.scItemPath;

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

    if (item.scItemId) {
        enrichedItemsByReference.set(
            item.scItemId.toLowerCase(),
            item,
        );
    }

    if (item.scItemPath) {
        enrichedItemsByReference.set(
            item.scItemPath.toLowerCase(),
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
    target.scItemId ??= source.scItemId;
    target.scItemName ??= source.scItemName;
    target.scItemPath ??= source.scItemPath;
    target.link ??= source.link;

    if (includeTemplate) {
        target.scTemplate ??= source.scTemplate;
    }
}