// @source-path [fobles] src/content/foundation/reference-data/processing/session/reference-model-session-facts.ts

import type { SitecoreHarvestFiltersState } from "../../../../../constants/_base/_base.types";
import type { SitecoreDataFactMap, SitecoreDataFactName } from "../../../cache/sitecore-data/sitecore-data.types";
import type { SitecoreHarvestResult } from "../../../harvesting/harvesting.types.js";
import type { SitecoreItemLocator } from "../../../workers/tasks/tasks.types.js";

export function filtersForFact(factName: SitecoreDataFactName): SitecoreHarvestFiltersState {
  return {
    parent: factName === "parent",
    children: factName === "children",
    referrers: factName === "referrers",
    customFields: factName === "customSections",
    standardFields: factName === "standardSections",
    layouts: factName === "layout",
    template: factName === "quickInfo",
  };
}

export function factFromResult<K extends SitecoreDataFactName>(
  factName: K,
  result: SitecoreHarvestResult,
): SitecoreDataFactMap[K] {
  const value =
    factName === "quickInfo"
      ? {
          result: {
            requested: { kind: "id" as const, value: result.rootItem.scItemId },
            status: "found" as const,
            value: result.rootItem,
          },
        }
      : factName === "parent"
        ? { parent: result.parent }
        : factName === "children"
          ? { childItems: result.childItems ?? [] }
          : factName === "referrers"
            ? { referrers: result.referrers ?? [] }
            : factName === "customSections"
              ? { sections: result.customFieldSections ?? [] }
              : factName === "standardSections"
                ? { sections: result.standardFieldSections ?? [] }
                : { layoutSectionFields: result.layoutSectionFields ?? [] };
  return value as unknown as SitecoreDataFactMap[K];
}

function locatorFromItem(item: SitecoreDataFactMap["parent"]["parent"]): SitecoreItemLocator | undefined {
  const id = item?.scItemId?.replace(/[{}]/g, "").trim();
  if (id) {
    return { kind: "id", value: id };
  }
  const path = item?.scItemPath?.trim();
  return path ? { kind: "path", value: path } : undefined;
}

export function relationshipLocators<K extends SitecoreDataFactName>(
  factName: K,
  value: SitecoreDataFactMap[K],
): SitecoreItemLocator[] {
  if (factName === "quickInfo") {
    const result = (value as SitecoreDataFactMap["quickInfo"]).result;
    const template = result.status === "found" ? locatorFromItem(result.value?.scTemplate) : undefined;
    return template ? [template] : [];
  }
  if (factName === "parent") {
    const locator = locatorFromItem((value as SitecoreDataFactMap["parent"]).parent);
    return locator ? [locator] : [];
  }
  if (factName === "children") {
    return (value as SitecoreDataFactMap["children"]).childItems
      .map(locatorFromItem)
      .filter((item): item is SitecoreItemLocator => item !== undefined);
  }
  if (factName === "referrers") {
    return (value as SitecoreDataFactMap["referrers"]).referrers
      .map(locatorFromItem)
      .filter((item): item is SitecoreItemLocator => item !== undefined);
  }
  return [];
}

export function sameItem(left: SitecoreItemLocator, right: SitecoreItemLocator): boolean {
  return (
    left.kind === right.kind &&
    left.value.replace(/[{}]/g, "").toLowerCase() === right.value.replace(/[{}]/g, "").toLowerCase()
  );
}
