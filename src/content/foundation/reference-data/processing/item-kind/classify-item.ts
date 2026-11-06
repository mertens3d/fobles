import { stripGuidBraces } from "../../../sitecore/guid.ts";
import { ITEM_KIND } from "../../../../../shared/structural/structural.const.ts";
import { isWithinSitePath } from "../../../../../shared/known-sites/known-sites-model.ts";
import type { ClassifyItemInput, ClassifyItemResult, BaseTemplateClassification } from "./item-kind.types.ts";

export function classifyItem(input: ClassifyItemInput): ClassifyItemResult {
  const inherited = new Set(input.inheritedTemplateIds.map((id) => stripGuidBraces(id).trim().toLowerCase()));
  const matched: BaseTemplateClassification[] = [];
  let classification: ClassifyItemResult["classification"] = ITEM_KIND.UNKNOWN;
  if (input.itemPath && isWithinSitePath(input.itemPath, input.pathRoots.templates)) {
    classification = ITEM_KIND.TEMPLATE;
  } else if (input.itemPath && isWithinSitePath(input.itemPath, input.pathRoots.content)) {
    for (const kind of [ITEM_KIND.TENANT, ITEM_KIND.SITE, ITEM_KIND.PAGE]) {
      if (Array.from(input.baseTemplateIds[kind]).some((id) => inherited.has(stripGuidBraces(id).trim().toLowerCase()))) {
        matched.push(kind);
      }
    }
    classification = matched[0] ?? ITEM_KIND.UNKNOWN;
  }
  return { classification, diagnostics: { matchedBaseTemplateClassifications: matched } };
}