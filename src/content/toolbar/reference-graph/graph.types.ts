import type cytoscape from "cytoscape";
import type { HarvestGraphControl } from "../../sitecore-harvester/sitecore-harvester.types";
import type { SitecoreHarvestResult } from "../../sitecore-harvester/sitecore-harvester.types";

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
  restoreRawValues: boolean;
  restoreStandardFields: boolean;
  harvested: boolean;
  cancelled: boolean;
  graph: SitecoreHarvestResult | undefined;
};
export type LayoutPreset = {
  label: string;
  build: () => cytoscape.LayoutOptions;
};
export type LayoutGraphPresetName = "dagre" | "cose-bilkent" | "fcose" | "breadthfirst";

export type PlaceholderGroupControl = {
  control: HarvestGraphControl;
  index: number;
};

// Placeholder keys are themselves paths (e.g. "main/vert-column-1" is a nested placeholder
// inside "main") - so groups nest the same way: "main/vert-column-1" is a compound child of
// "main", not its sibling. A Map keyed by the normalized full path dedupes/links ancestors
// regardless of which order controls are visited in; ensurePlaceholderGroup recursively
// creates any ancestor group that doesn't have its own controls yet (just a pass-through box).
export type PlaceholderGroup = {
  id: string;
  label: string;
  parentId: string;
  controls: PlaceholderGroupControl[];
};
