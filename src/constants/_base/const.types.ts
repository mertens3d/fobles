import type cytoscape from "cytoscape";

export type selectorHints = selectorHint[];

export type selectorHint = string;

export type GraphEdgeStyle = "bezier" | "taxi";

export type LayoutPreset = {
  label: string;
  edgeStyle: GraphEdgeStyle;
  build: (rootTreeNodeId: string) => cytoscape.LayoutOptions;
};
