
import type { ReferenceGraphFiltersState } from "./graph.types";

export const DEFAULT_RENDERING_GRAPH_FILTERS_STATE: ReferenceGraphFiltersState = {
  parent: true,
  children: true,
  layout: true,
  referrers: true,
  sections: true,
  template: true,
};