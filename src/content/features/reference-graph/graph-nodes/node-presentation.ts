// @source-path [fobles] src/content/features/reference-graph/graph-nodes/node-presentation.ts

import {
  _REFERENCE_GRAPH_BASE,
} from "../../../../constants/_base/_REFERENCE_GRAPH_BASE";
import type {
  NodePresentationByKind,
} from "./node-presentation.types";

const NODE_KIND =
  _REFERENCE_GRAPH_BASE.NODE_KIND;

// Cytoscape applies one font style to the complete node label.
// Unicode small capitals make the secondary label visually smaller
// without introducing a second DOM/Cytoscape overlay.
export const NODE_PRESENTATION_BY_KIND:
  NodePresentationByKind = {
  [NODE_KIND.ROOT]: {
    labelMode: "name",
    color: "#2f6fed",
    shape: "hexagon",
  },
  [NODE_KIND.CHILD]: {
    labelMode: "name",
    color: "#d1428a",
  },
  [NODE_KIND.CONTROL]: {
    labelMode: "name",
    color: "#1f9d55",
  },
  [NODE_KIND.DATASOURCE]: {
    labelMode: "datasourceName",
    color: "#c9820f",
    secondaryLabel: "(datasource)",
  },
  [NODE_KIND.DEVICE]: {
    labelMode: "name",
    color: "#5a6b80",
    secondaryLabel: "(device)",
  },
  [NODE_KIND.FIELD]: {
    labelMode: "fieldName",
    color: "#7a7a7a",
  },
  [NODE_KIND.ITEM]: {
    labelMode: "name",
    color: "#2f6fed",
  },
  [NODE_KIND.PLACEHOLDER]: {
    labelMode: "name",
    color: "#2f6fed",
    secondaryLabel: "(placeholder)",
  },
  [NODE_KIND.LAYOUTS]: {
    labelMode: "name",
    color: "#9a5b1f",
  },
  [NODE_KIND.PAGE_LAYOUT]: {
    labelMode: "name",
    color: "#3a6a6a",
  },
  [NODE_KIND.PARENT]: {
    labelMode: "name",
    color: "#b8860b",
  },
  [NODE_KIND.REFERRER]: {
    labelMode: "name",
    color: "#d13f3f",
  },
  [NODE_KIND.RENDERING]: {
    labelMode: "name",
    color: "#2f8f6f",
    secondaryLabel: "(rendering)",
  },
  [NODE_KIND.RENDERING_PARAMETER]: {
    labelMode: "parameterName",
    color: "#6a3a6a",
    secondaryLabel: "(parameter)",
  },
  [NODE_KIND.SECTION]: {
    labelMode: "name",
    color: "#555566",
  },
  [NODE_KIND.STRUCTURAL]: {
    labelMode: "name",
    color: "#8a97a8",
  },
  [NODE_KIND.TEMPLATE]: {
    labelMode: "name",
    color: "#0f9aa0",
  },
  [NODE_KIND.VARIANT]: {
    labelMode: "name",
    color: "#8a3fd6",
  },
};