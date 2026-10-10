import type { SitecoreHarvestResult } from "../../sitecore-harvester/sitecore-harvester.types";
import type { SitecoreHarvestFiltersState } from "../../sitecore-harvester/sitecore-harvester.types";

export const DEFAULT_RENDERING_GRAPH_FILTERS_STATE: SitecoreHarvestFiltersState = {
  parent: true,
  children: true,
  layout: true,
  referrers: true,
  sections: true,
  template: true,
  controls: true,
};

export function createSingleFilterState(enabledKey: keyof SitecoreHarvestFiltersState,): SitecoreHarvestFiltersState {
  return {
    parent: enabledKey === "parent",
    children: enabledKey === "children",
    layout: enabledKey === "layout",
    referrers: enabledKey === "referrers",
    sections: enabledKey === "sections",
    template: enabledKey === "template",
    controls: enabledKey === "controls",
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

    case "layout":
      mergedGraph.sharedLayoutName = partialGraph.sharedLayoutName;
      mergedGraph.sharedLayoutLink = partialGraph.sharedLayoutLink;
      mergedGraph.sharedLayoutPath = partialGraph.sharedLayoutPath;
      mergedGraph.controls = partialGraph.controls;
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