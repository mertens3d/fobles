// @source-path [fobles] src/content/features/reference-graph/graph.types.ts

import type cytoscape from "cytoscape";
import type {
  SitecoreHarvestFiltersState,
  SitecoreHarvestResult,
} from "../../sitecore-harvester/sitecore-harvester.types";

export type GlyphState = "expanded" | "collapsed" | "leaf";

export type LayoutPreset = {
  label: string;
  build: () => cytoscape.LayoutOptions;
};

export type LayoutGraphPresetName =
  | "dagre"
  | "cose-bilkent"
  | "fcose"
  | "breadthfirst";

// Shared by reference-graph-modal/ReferenceGraphApp/useCytoscape/event-handlers. existingResult
// is only supplied for a lazy-filter-enable request (see reference-graph-app.tsx); a reroot
// (double-click a node) omits it, since that's a full fresh harvest at the new root item.
export type HarvestForLink = (
  link: string,
  filters: SitecoreHarvestFiltersState,
  existingResult?: SitecoreHarvestResult,
) => Promise<SitecoreHarvestResult | undefined>;
