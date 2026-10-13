import type cytoscape from "cytoscape";
import { kindClass } from "../graph-nodes/graph-helpers";
import { CONST } from "../../../../constants/const";

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
    {
        selector: `.${kindClass(CONST.FOBLES.REFERENCE_GRAPH.NODE_KIND.STRUCTURAL)}`,
        style: {
            "font-size": 9,
            "background-color": CONST.FOBLES.REFERENCE_GRAPH.STRUCTURAL_COLOR,
            "background-opacity": 0.15,
            "border-color": CONST.FOBLES.REFERENCE_GRAPH.STRUCTURAL_COLOR,
        },
    },
    ...Object.entries(CONST.FOBLES.REFERENCE_GRAPH.KIND_COLORS).map(([kind, color]) => ({
        selector: `.${kindClass(kind)}`,
        style: {
            "background-color": color,
            "background-opacity": 0.15,
            "border-color": color,
        },
    })),
    {
        // The root item is the one node every graph always has - bigger/bolder/more saturated
        // than anything else so it still reads as "the root" no matter which layout algorithm
        // (and whichever node that algorithm happens to visually center) is active.
        selector: `.${kindClass(CONST.FOBLES.REFERENCE_GRAPH.NODE_KIND.ITEM)}`,
        style: {
            "font-size": 13,
            "font-weight": "bold",
            "border-width": 3,
            "background-opacity": 0.35,
            padding: "14px",
        },
    },
    {
        // :parent matches any node with children (here: Section nodes, via each Field's
        // data.parent) - deliberately doesn't repeat width/height from the childless rule above,
        // since specifying them at all would disable cytoscape's own auto-fit-to-children sizing.
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
        selector: "related",
        style: { "curve-style": "bezier", "target-arrow-shape": "triangle", width: 1 },
    },

];