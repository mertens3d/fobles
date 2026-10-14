// @source-path [fobles] src/content/sitecore-harvester/coordinator/enrichment-task-planner.ts

import { buildFoblesUrl } from "../../features/augmentor/helper";
import { isItemGraphNodeDataResolved } from "../enrichment/item-enricher";
import type { ItemGraphNodeData, SitecoreHarvestResult } from "../sitecore-harvester.types";
import type { EnrichItemTask } from "../worker-pool/worker-task.types";

function lookupKeyFor(item: ItemGraphNodeData): string | undefined {
  const reference = item.scItemId || item.scItemPath;
  return reference?.toLowerCase();
}

function isItemGraphNodeData(value: unknown): value is ItemGraphNodeData {
  return (
    typeof value === "object" &&
    value !== null &&
    "type" in value &&
    (value).type === "scItem"
  );
}

function collectRecursive(
  value: unknown,
  groups: Map<string, ItemGraphNodeData[]>,
  visited: WeakSet<object>,
): void {
  if (typeof value !== "object" || value === null || visited.has(value)) {
    return;
  }

  visited.add(value);

  if (isItemGraphNodeData(value)) {
    const key = lookupKeyFor(value);
    if (key) {
      const group = groups.get(key) ?? [];
      group.push(value);
      groups.set(key, group);
    }

    // Still recurse into the node's own properties (e.g. scTemplate) - every nested
    // ItemGraphNodeData is discovered the same generic way, with no per-property special-casing.
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      collectRecursive(entry, groups, visited);
    }
    return;
  }

  for (const propertyValue of Object.values(value)) {
    collectRecursive(propertyValue, groups, visited);
  }
}

// Groups every discovered ItemGraphNodeData reference by stable lookup identity (scItemId or
// scItemPath, case-insensitively), regardless of where in SitecoreHarvestResult it lives.
export function collectItemGraphNodeDataGroups(
  result: SitecoreHarvestResult,
): Map<string, ItemGraphNodeData[]> {
  const groups = new Map<string, ItemGraphNodeData[]>();
  collectRecursive(result, groups, new WeakSet<object>());
  return groups;
}

// Only unresolved groups need an enrichment task - a group is resolved once its first (and every
// subsequent, since they share identity) member is fully populated.
export function buildEnrichItemTasks(
  requestId: string,
  groups: Map<string, ItemGraphNodeData[]>,
): EnrichItemTask[] {
  const tasks: EnrichItemTask[] = [];

  for (const [, items] of groups) {
    const representative = items[0];
    if (!representative || items.some(isItemGraphNodeDataResolved)) {
      continue;
    }

    const reference = representative.scItemId || representative.scItemPath;
    if (!reference) {
      continue;
    }

    tasks.push({
      requestId,
      taskId: crypto.randomUUID(),
      type: "enrich-item",
      url: buildFoblesUrl(reference),
      lookup: {
        scItemId: representative.scItemId,
        scItemPath: representative.scItemPath,
      },
    });
  }

  return tasks;
}

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

    const itemReference = item.scItemId || item.scItemPath;
    if (itemReference) {
      item.link ??= buildFoblesUrl(itemReference);
    }
  }
}
