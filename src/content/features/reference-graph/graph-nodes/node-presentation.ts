// @source-path [fobles] src/content/features/reference-graph/graph-nodes/node-presentation.ts

import {
  _REFERENCE_GRAPH_BASE,
} from "../../../../constants/_base/_REFERENCE_GRAPH_BASE";
import type {
  NodePresentationByKind,
} from "./node-presentation.types";

const NODE_KIND =
  _REFERENCE_GRAPH_BASE.NODE_KIND;

export const DEFAULT_WIDTH = 110;
export const DEFAULT_HEIGHT = 30;
export const ELLIPSE_SIZE = 50;

export const NODE_PRESENTATION_BY_KIND:
  NodePresentationByKind = {
  [NODE_KIND.ROOT]: {
    labelMode: "name",
    color: "#2f6fed",
    shape: "hexagon",
    width: DEFAULT_WIDTH,
    height: DEFAULT_HEIGHT,
  },
  [NODE_KIND.CHILD]: {
    labelMode: "name",
    color: "#d1428a",
    width: DEFAULT_WIDTH,
    height: DEFAULT_HEIGHT,
  },
  [NODE_KIND.CONTROL]: {
    labelMode: "name",
    color: "#1f9d55",
    width: DEFAULT_WIDTH,
    height: DEFAULT_HEIGHT,
  },
  [NODE_KIND.DATASOURCE]: {
    labelMode: "datasourceName",
    color: "#c9820f",
    secondaryLabel: "(datasource)",
    width: DEFAULT_WIDTH,
    height: DEFAULT_HEIGHT,
  },
  [NODE_KIND.DEVICE]: {
    labelMode: "name",
    color: "#5a6b80",
    secondaryLabel: "(device)",
    width: DEFAULT_WIDTH,
    height: DEFAULT_HEIGHT,
  },
  [NODE_KIND.FIELD]: {
    labelMode: "fieldName",
    color: "#7a7a7a",
    width: DEFAULT_WIDTH,
    height: DEFAULT_HEIGHT,
  },
  [NODE_KIND.ITEM]: {
    labelMode: "name",
    color: "#2f6fed",
    width: DEFAULT_WIDTH,
    height: DEFAULT_HEIGHT,
  },
  [NODE_KIND.PLACEHOLDER]: {
    labelMode: "name",
    color: "#2f6fed",
    secondaryLabel: "(placeholder)",
    width: ELLIPSE_SIZE,
    height: ELLIPSE_SIZE,
    shape: "ellipse",
  },
  [NODE_KIND.LAYOUTS]: {
    labelMode: "name",
    color: "#9a5b1f",
    width: DEFAULT_WIDTH,
    height: DEFAULT_HEIGHT,
  },
  [NODE_KIND.PAGE_LAYOUT]: {
    labelMode: "name",
    color: "#3a6a6a",
    width: DEFAULT_WIDTH,
    height: DEFAULT_HEIGHT,
  },
  [NODE_KIND.PARENT]: {
    labelMode: "name",
    color: "#b8860b",
    width: DEFAULT_WIDTH,
    height: DEFAULT_HEIGHT,
  },
  [NODE_KIND.REFERRER]: {
    labelMode: "name",
    color: "#d13f3f",
    width: DEFAULT_WIDTH,
    height: DEFAULT_HEIGHT,
  },
  [NODE_KIND.RENDERING]: {
    labelMode: "name",
    color: "#2f8f6f",
    secondaryLabel: "(rendering)",
    width: DEFAULT_WIDTH,
    height: DEFAULT_HEIGHT,
  },
  [NODE_KIND.RENDERING_PARAMETER]: {
    labelMode: "parameterName",
    color: "#6a3a6a",
    secondaryLabel: "(parameter)",
    width: DEFAULT_WIDTH,
    height: DEFAULT_HEIGHT,
  },
  [NODE_KIND.SECTION]: {
    labelMode: "name",
    color: "#555566",
    width: DEFAULT_WIDTH,
    height: DEFAULT_HEIGHT,
  },
  [NODE_KIND.STRUCTURAL]: {
    labelMode: "name",
    color: "#8a97a8",
    width: ELLIPSE_SIZE,
    height: ELLIPSE_SIZE,
  },
  [NODE_KIND.TEMPLATE]: {
    labelMode: "name",
    color: "#0f9aa0",
    width: DEFAULT_WIDTH,
    height: DEFAULT_HEIGHT,
  },
  [NODE_KIND.VARIANT]: {
    labelMode: "name",
    color: "#8a3fd6",
    width: DEFAULT_WIDTH,
    height: DEFAULT_HEIGHT,
  },
};