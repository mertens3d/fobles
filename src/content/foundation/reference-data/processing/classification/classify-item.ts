// @source-path [fobles] src/content/foundation/reference-data/processing/classification/classify-item.ts

import { stripGuidBraces } from "../../../sitecore/guid.ts";
import type {
  BaseTemplateClassification,
  BaseTemplateIdSets,
  ClassificationDiagnostics,
  ClassificationPathRoots,
  ItemClassification,
} from "./item-classification.types.ts";

export type ClassifyItemInput = {
  itemPath: string | undefined;
  // Normalized or not - classifyItem normalizes defensively either way. Must include the item's
  // own immediate template id (the inheritance graph's root), not just its ancestors.
  inheritedTemplateIds: readonly string[];
  baseTemplateIds: BaseTemplateIdSets;
  pathRoots: ClassificationPathRoots;
};

export type ClassifyItemResult = { classification: ItemClassification; diagnostics: ClassificationDiagnostics };

function normalizeId(id: string): string {
  return stripGuidBraces(id).toLowerCase();
}

function normalizeSet(ids: ReadonlySet<string>): ReadonlySet<string> {
  return new Set(Array.from(ids, normalizeId));
}

function isAtOrBelowPath(itemPath: string | undefined, root: string): boolean {
  if (!itemPath) {
    return false;
  }
  const normalizedPath = itemPath.toLowerCase();
  const normalizedRoot = root.toLowerCase();
  return normalizedPath === normalizedRoot || normalizedPath.startsWith(`${normalizedRoot}/`);
}

// Classification is mutually exclusive and never throws for an unmatched item - precedence is
// Template > Tenant > Site > Page > Other, applied in that order below.
export function classifyItem({
  itemPath,
  inheritedTemplateIds,
  baseTemplateIds,
  pathRoots,
}: ClassifyItemInput): ClassifyItemResult {
  const noMatches: ClassificationDiagnostics = { matchedBaseTemplateClassifications: [] };

  if (isAtOrBelowPath(itemPath, pathRoots.templates)) {
    return { classification: "template", diagnostics: noMatches };
  }
  if (!isAtOrBelowPath(itemPath, pathRoots.content)) {
    return { classification: "other", diagnostics: noMatches };
  }

  const normalizedInheritedIds = inheritedTemplateIds.map(normalizeId);
  const tenantIds = normalizeSet(baseTemplateIds.tenant);
  const siteIds = normalizeSet(baseTemplateIds.site);
  const pageIds = normalizeSet(baseTemplateIds.page);

  const matched: BaseTemplateClassification[] = [];
  if (normalizedInheritedIds.some((id) => tenantIds.has(id))) {
    matched.push("tenant");
  }
  if (normalizedInheritedIds.some((id) => siteIds.has(id))) {
    matched.push("site");
  }
  if (normalizedInheritedIds.some((id) => pageIds.has(id))) {
    matched.push("page");
  }

  const classification: ItemClassification = matched.includes("tenant")
    ? "tenant"
    : matched.includes("site")
      ? "site"
      : matched.includes("page")
        ? "page"
        : "other";
  return { classification, diagnostics: { matchedBaseTemplateClassifications: matched } };
}
