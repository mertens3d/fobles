import type cytoscape from "cytoscape";
import { kindClass } from "../graph-nodes/graph-helpers";
import { NODE_PRESENTATION_BY_KIND } from "../graph-nodes/node-presentation";
import { CONST } from "../../../../constants/const";

type CytoscapeStyle = NonNullable<
  cytoscape.CytoscapeOptions["style"]
>;

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
      "border-width": 1,
      "border-color": "#2f6fed",
      "text-valign": "center",
      "text-halign": "center",
      "text-wrap": "wrap",
    },
  },
  {
    // Fixed, label-based sizing only makes sense for leaf nodes - a compound parent (a
    // Section, via its Fields' data.parent) needs to auto-size to fit its children instead,
    // which only happens when width/height aren't explicitly set on it at all.
    selector: "node:childless",
    style: {
      width: "label",
      height: "label",
      padding: "10px",
    },
  },
  ...Object.entries(NODE_PRESENTATION_BY_KIND).map(
    ([kind, presentation]) => ({
      selector: `.${kindClass(kind)}`,
      style: {
        "background-color": presentation.color,
        "background-opacity": 0.15,
        "border-color": presentation.color,
        ...(presentation.shape
          ? { shape: presentation.shape }
          : {}),
      },
    }),
  ),
  {
    selector: `.${kindClass(
      CONST.FOBLES.REFERENCE_GRAPH.NODE_KIND.STRUCTURAL,
    )}`,
    style: {
      "font-size": 9,
    },
  },
  {
    // Compound nodes auto-size around their contained children.
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
    // A flat-top regular hexagon has a bounding-box height of sqrt(3) / 2 times its width.
    selector: `.${kindClass(
      CONST.FOBLES.REFERENCE_GRAPH.NODE_KIND.ROOT,
    )}`,
    style: {
      shape: "hexagon",
      width: 90,
      height: 78,
      padding: "0px",
      "font-size": 13,
      "font-weight": "bold",
      "border-width": 3,
      "background-opacity": 0.35,
      "text-valign": "center",
      "text-halign": "center",
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