import type { SitecoreHarvestFiltersState } from "../../../constants/_base/_base.types";
import type { GraphParameterVisibilitySettings } from "./reference-graph.types.js";

export const DEFAULT_RENDERING_GRAPH_FILTERS_STATE: SitecoreHarvestFiltersState = {
  parent: false,
  children: false,
  layouts: true,
  referrers: false,
  customFields: false,
  standardFields: false,
  template: false,
};

export const DEFAULT_GRAPH_PARAMETER_VISIBILITY_SETTINGS: GraphParameterVisibilitySettings = {
  hideEmptyParameters: true,
  hideNonGuidParameters: true,
};

export const STORAGE_KEY = "fobles-reference-graph-parameter-visibility";
