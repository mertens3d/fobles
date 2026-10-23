// @source-path [fobles] src/content/features/reference-graph/graph-filters.ts

import type { SitecoreHarvestFiltersState } from "../../sitecore-harvester/sitecore-harvester.types";

export const DEFAULT_RENDERING_GRAPH_FILTERS_STATE: SitecoreHarvestFiltersState = {
  parent: false,
  children: false,
  layouts: true,
  referrers: false,
  customFields: false,
  standardFields: false,
  template: false,
};

export function createAllFiltersState(
    enabled: boolean,
): SitecoreHarvestFiltersState {
    return Object.fromEntries(
        Object.keys(DEFAULT_RENDERING_GRAPH_FILTERS_STATE).map(
            (key) => [key, enabled],
        ),
    ) as SitecoreHarvestFiltersState;
}

export function createSingleFilterState(enabledKey: keyof SitecoreHarvestFiltersState,): SitecoreHarvestFiltersState {
  return {
    parent: enabledKey === "parent",
    children: enabledKey === "children",
    layouts: enabledKey === "layouts",
    referrers: enabledKey === "referrers",
    customFields: enabledKey === "customFields",
    standardFields: enabledKey === "standardFields",
    template: enabledKey === "template",
  };
}

export function getEnabledFilterKeys(filters: SitecoreHarvestFiltersState,): Set<keyof SitecoreHarvestFiltersState> {
  return new Set(Object.entries(filters)
    .filter(([, enabled]) => enabled)
    .map(([key]) => key as keyof SitecoreHarvestFiltersState,),
  );
}