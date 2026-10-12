// @source-path [fobles] src/content/toolbar/reference-graph/graph-filters.ts

import type { SitecoreHarvestResult } from "../../sitecore-harvester/sitecore-harvester.types";
import type { SitecoreHarvestFiltersState } from "../../sitecore-harvester/sitecore-harvester.types";

export const DEFAULT_RENDERING_GRAPH_FILTERS_STATE: SitecoreHarvestFiltersState = {
  parent: true,
  children: true,
  layouts: true,
  referrers: true,
  sections: true,
  template: true,
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
    sections: enabledKey === "sections",
    template: enabledKey === "template",
  };
}

export function mergeFilterGraph(currentGraph: SitecoreHarvestResult, partialGraph: SitecoreHarvestResult, filterKey: keyof SitecoreHarvestFiltersState,): SitecoreHarvestResult {
  const mergedGraph = { ...currentGraph };

  switch (filterKey) {
    case "parent": mergedGraph.parent = partialGraph.parent;
      break;

    case "children":
      mergedGraph.childItems = partialGraph.childItems;
      break;

    case "layouts":
      mergedGraph.layoutSectionFields = partialGraph.layoutSectionFields;
      break;

    case "referrers":
      mergedGraph.referrers = partialGraph.referrers;
      break;

    case "sections":
      mergedGraph.sections = partialGraph.sections;
      break;

    case "template":
      break;

  }

  return mergedGraph;
}

export function getEnabledFilterKeys(filters: SitecoreHarvestFiltersState,): Set<keyof SitecoreHarvestFiltersState> {
  return new Set(Object.entries(filters)
    .filter(([, enabled]) => enabled)
    .map(([key]) => key as keyof SitecoreHarvestFiltersState,),
  );
}