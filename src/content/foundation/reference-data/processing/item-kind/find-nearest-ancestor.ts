import { ITEM_KIND_LIMITS } from "./item-kind-limits.const.ts";
import type { AncestorWalkItem, BaseTemplateClassification, ClassifyAncestor, GetParentItem, FindNearestAncestorResult } from "./item-kind.types.ts";

export type { AncestorWalkItem, ClassifyAncestor, GetParentItem, FindNearestAncestorResult } from "./item-kind.types.ts";

export async function findNearestAncestorByClassification(
  start: AncestorWalkItem,
  targetClassification: BaseTemplateClassification,
  classify: ClassifyAncestor,
  getParent: GetParentItem,
  maxVisited: number = ITEM_KIND_LIMITS.MAX_VISITED_ANCESTORS,
): Promise<FindNearestAncestorResult> {
  const visited = new Set<string>();
  let current: AncestorWalkItem | undefined = start;
  let result: FindNearestAncestorResult = { outcome: "not-found" };
  while (current) {
    const key = current.id.replace(/[{}]/g, "").trim().toLowerCase();
    if (visited.has(key)) {
      result = { outcome: "cycle-detected" };
      break;
    } else if (visited.size >= maxVisited) {
      result = { outcome: "limit-reached", limit: maxVisited };
      break;
    } else {
      visited.add(key);
      if (await classify(current) === targetClassification) {
        result = { outcome: "found", item: current };
        break;
      }
      current = await getParent(current);
    }
  }
  return result;
}