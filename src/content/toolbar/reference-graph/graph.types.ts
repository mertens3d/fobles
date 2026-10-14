// @source-path [fobles] src/content/toolbar/reference-graph/graph.types.ts

import type cytoscape from "cytoscape";
import type {
  SitecoreHarvestResult,
} from "../../sitecore-harvester/sitecore-harvester.types";
import type { BooleanTripleState } from "../../macros/ribbon-toggle-macro";

export type GlyphState = "expanded" | "collapsed" | "leaf";

// POC: harvests the active item's default-device layout straight from the Content Editor's own
// Layout section, instead of navigating LayoutDetails/DeviceEditor/SelectRendering/Field Editor -
// requires View > Standard Fields and View > Raw Values both enabled so the raw layout XML field
// is actually on the page. See src/reference graph/README.md for the research behind this. Both
// toggles are enabled/restored automatically (see the resume machine at the bottom of this file)
// since flipping either one is a full page postback that destroys this execution context. The
// harvested graph rides along in the same persisted pending state, since the restore step's own
// reload would otherwise wipe it before the modal can be shown.
export type PendingReferenceGraph = {
  itemId: string;
  restoreRawValues: BooleanTripleState;
  restoreStandardFields: BooleanTripleState;
  harvested: boolean;
  cancelled: boolean;
  graph: SitecoreHarvestResult | undefined;
};

export type LayoutPreset = {
  label: string;
  build: () => cytoscape.LayoutOptions;
};

export type LayoutGraphPresetName =
  | "dagre"
  | "cose-bilkent"
  | "fcose"
  | "breadthfirst";
