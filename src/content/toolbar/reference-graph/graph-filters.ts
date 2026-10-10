import type { ReferenceGraphFiltersState } from "./graph.types";
import type { ReferenceGraphResult } from "./reference-graph.types";

export const DEFAULT_RENDERING_GRAPH_FILTERS_STATE: ReferenceGraphFiltersState = {
  parent: true,
  children: true,
  layout: true,
  referrers: true,
  sections: true,
  template: true,
  controls: true,
};

export function createSingleFilterState(enabledKey: keyof ReferenceGraphFiltersState,): ReferenceGraphFiltersState {
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

export function mergeFilterGraph(currentGraph: ReferenceGraphResult, partialGraph: ReferenceGraphResult, filterKey: keyof ReferenceGraphFiltersState,): ReferenceGraphResult {
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

export function getEnabledFilterKeys(filters: ReferenceGraphFiltersState,): Set<keyof ReferenceGraphFiltersState> {
  return new Set(Object.entries(filters)
    .filter(([, enabled]) => enabled)
    .map(([key]) => key as keyof ReferenceGraphFiltersState,),
  );
}