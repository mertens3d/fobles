import type cytoscape from "cytoscape";
import type { NodeKind } from "../../../../constants/_base/_REFERENCE_GRAPH_BASE";

export type LabelBreakResult = { success: boolean; label: string };

export type NodeLabelMode = "name" | "datasourceName" | "kindOnly" | "fieldName" | "parameterName";

export type NodePresentation = {
  labelMode: NodeLabelMode;
  color: string;
  shape?: cytoscape.Css.NodeShape;
  icon?: string;
  secondaryLabel?: string;
  width: number;
  height: number;
};

export type NodePresentationByKind = Record<NodeKind, NodePresentation>;
