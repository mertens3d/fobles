import type cytoscape from "cytoscape";
import type { _REFERENCE_GRAPH_BASE } from "./_REFERENCE_GRAPH_BASE";

export type selectorHints = selectorHint[];

export type selectorHint = string;

export type GraphEdgeStyle = "bezier" | "taxi";

export type LayoutPreset = {
  label: string;
  edgeStyle: GraphEdgeStyle;
  build: (rootTreeNodeId: string) => cytoscape.LayoutOptions;
};

export type NodeKind = (typeof _REFERENCE_GRAPH_BASE.NODE_KIND)[keyof typeof _REFERENCE_GRAPH_BASE.NODE_KIND];

export type SitecoreHarvestFiltersState = {
  parent: boolean;
  children: boolean;
  layouts: boolean;
  referrers: boolean;
  customFields: boolean;
  standardFields: boolean;
  template: boolean;
};
