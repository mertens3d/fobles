import type cytoscape from "cytoscape";
import { CONST } from "../../../../constants/const";
import { kindClass } from "../graph-nodes/graph-helpers";
import { ELLIPSE_SIZE, NODE_PRESENTATION_BY_KIND } from "../graph-nodes/node-presentation";

type CytoscapeStyle = NonNullable<cytoscape.CytoscapeOptions["style"]>;

export const REFERENCE_GRAPH_STYLE: CytoscapeStyle = [
  {
    selector: "node",
    style: {
      label: "data(label)",
      "font-size": 10,
      color: "#203047",
      shape: "round-rectangle",
      "background-color": "#eaf1fc",
      "background-opacity": 1,
      "border-width": 2,
      "border-color": "#2f6fed",
      "text-valign": "center",
      "text-halign": "center",
      "text-wrap": "wrap",
      "text-overflow-wrap": "anywhere",
    },
  },
  {
    selector: "node:childless",
    style: {
      width: "label",
      height: "label",
      padding: "10px",
    },
  },
  ...Object.entries(NODE_PRESENTATION_BY_KIND).map(([kind, presentation]) => ({
    selector: `.${kindClass(kind)}`,
    style: {
      width: presentation.width,
      height: presentation.height,
      "text-max-width": `${presentation.width - 16}px`,
      "background-color": presentation.color,
      "background-opacity": 0.15,
      "border-color": presentation.color,
      ...(presentation.shape ? { shape: presentation.shape } : {}),
    },
  })),
  {
    selector: `.${kindClass(CONST.FOBLES.REFERENCE_GRAPH.NODE_KIND.STRUCTURAL)}`,
    style: {
      "font-size": 9,
      shape: "ellipse",
      width: ELLIPSE_SIZE,
      height: ELLIPSE_SIZE,
    },
  },
  {
    selector: ":parent",
    style: {
      shape: "round-rectangle",
      "background-opacity": 0.15,
      "border-style": "solid",
      "border-width": 1,
      "text-valign": "top",
      "text-halign": "center",
      padding: "16px",
    },
  },
  {
    selector: `.${kindClass(CONST.FOBLES.REFERENCE_GRAPH.NODE_KIND.ROOT)}`,
    style: {
      shape: "hexagon",
      width: 90,
      height: 78,
      padding: "0px",
      "font-size": 13,
      "font-weight": "bold",
      "border-width": 3,
      "background-opacity": 0.35,
    },
  },
  {
    selector: "edge",
    style: {
      "curve-style": "bezier",
      "target-arrow-shape": "triangle",
      width: 1,
    },
  },
];