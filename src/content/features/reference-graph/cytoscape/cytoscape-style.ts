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
      "text-max-width": `${presentation.width - 4}px`,
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
    selector: ".fobles-reference-graph-compound-group",
    style: {
      label: "",
      shape: "round-rectangle",
      "background-color": "#8a97a8",
      "background-opacity": 0.05,
      "border-color": "#8a97a8",
      "border-style": "dashed",
      "border-width": 1,
      padding: "18px",
    },
  },
  {
    selector: ".fobles-reference-graph-compound-group--invisible",
    style: {
      "background-opacity": 0,
      "border-width": 0,
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
  {
    selector: 'node[enrichmentStatus = "not-found"]',
    style: {
      "background-color": "#ffdddd",
      "border-color": "#d13f3f",
      "border-style": "dashed",
    },
  },
  {
    // Item header icon, captured during quick-info enrichment - gated on [icon] so nodes
    // without one (or whose icon never loaded) just keep the plain color-tinted style above.
    selector: "node[icon]",
    style: {
      "background-image": "data(icon)",
      "background-fit": "none",
      "background-clip": "none",
      "background-width": "16",
      "background-height": "16",
      "background-position-x": "4px",
      "background-position-y": "4px",
      "background-repeat": "no-repeat",
    },
  },
];