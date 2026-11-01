// @source-path [fobles] src/content/foundation/reference-data/processing/classification/find-nearest-ancestor.ts

import { CLASSIFICATION_LIMITS } from "./classification-limits.const.ts";
import type { BaseTemplateClassification, ItemClassification } from "./item-classification.types.ts";

export type AncestorWalkItem = { id: string; itemPath: string | undefined };
export type ClassifyAncestor = (item: AncestorWalkItem) => Promise<ItemClassification>;
export type GetParentItem = (item: AncestorWalkItem) => Promise<AncestorWalkItem | undefined>;

export type FindNearestAncestorResult =
  | { outcome: "found"; item: AncestorWalkItem }
  | { outcome: "not-found" }
  | { outcome: "cycle-detected" }
  | { outcome: "limit-reached"; limit: number };

function ancestorKey(item: AncestorWalkItem): string {
  return item.id.replace(/[{}]/g, "").trim().toLowerCase();
}

// Shared by Site and Tenant ancestor lookup - both check the selected item itself first, then
// walk parents, returning only the single nearest match (never every matching ancestor).
export async function findNearestAncestorByClassification(
  start: AncestorWalkItem,
  targetClassification: BaseTemplateClassification,
  classify: ClassifyAncestor,
  getParent: GetParentItem,
  maxVisited: number = CLASSIFICATION_LIMITS.MAX_VISITED_ANCESTORS,
): Promise<FindNearestAncestorResult> {
  const visited = new Set<string>();
  let current: AncestorWalkItem | undefined = start;

  while (current) {
    const key = ancestorKey(current);
    if (visited.has(key)) return { outcome: "cycle-detected" };
    if (visited.size >= maxVisited) return { outcome: "limit-reached", limit: maxVisited };
    visited.add(key);

    const classification = await classify(current);
    if (classification === targetClassification) return { outcome: "found", item: current };

    current = await getParent(current);
  }

  return { outcome: "not-found" };
}
