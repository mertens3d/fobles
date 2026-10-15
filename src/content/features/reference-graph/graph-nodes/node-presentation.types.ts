// @source-path [fobles] src/content/features/reference-graph/graph-nodes/node-presentation.types.ts

import type cytoscape from "cytoscape";
import type {
  NodeKind,
} from "../../../../constants/_base/_REFERENCE_GRAPH_BASE";

// name           - plain item/non-item name.
// nameAndKind    - "name\n[kind]" (e.g. a Device).
// datasourceName - "ds: name".
// kindOnly       - "[kind]", ignoring the resolved name entirely (e.g. a Rendering).
// fieldName      - a section field's own label (falls back to name if provenance isn't a field).
// parameterName  - a rendering parameter's own name (falls back to name otherwise).
export type NodeLabelMode =
  | "name"
  | "nameAndKind"
  | "datasourceName"
  | "kindOnly"
  | "fieldName"
  | "parameterName";

export type NodePresentation = {
  labelMode: NodeLabelMode;
  color: string;
  shape?: cytoscape.Css.NodeShape;
  icon?: string;
  secondaryLabel?: string;
};

export type NodePresentationByKind =
  Record<NodeKind, NodePresentation>;