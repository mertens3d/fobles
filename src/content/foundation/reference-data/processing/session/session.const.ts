import type { SitecoreHarvestFiltersState } from "../../../../../constants/_base/_base.types";
import type { SitecoreDataFactName } from "../../../cache/sitecore-data/sitecore-data.types";

export const FACTS_BY_FILTER: ReadonlyArray<[keyof SitecoreHarvestFiltersState, SitecoreDataFactName]> = [
  ["parent", "parent"],
  ["children", "children"],
  ["referrers", "referrers"],
  ["customFields", "customSections"],
  ["standardFields", "standardSections"],
  ["layouts", "layout"],
];
