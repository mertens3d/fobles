import type { GraphCollapseKey } from "./graph-collapse.types";
import type { EnrichmentStatus } from "../data-tree/data-tree.types";

export type GraphNodeData = {
  id: string;
  parentTreeNodeId: string | undefined;
  parent: string | undefined;
  label: string;
  childTreeNodeIds: string[];
  expandable: boolean;
  collapseKey: GraphCollapseKey;
  itemId: string | undefined;
  path: string | undefined;
  link: string | undefined;
  drillDown: boolean;
  icon: string | undefined;
  renderingParameterValue: string | undefined;
  renderingParameterIsItemReference: boolean | undefined;
  enrichmentStatus: EnrichmentStatus | undefined;
};
export type ExpandCollapseAction = "single" | "same-kind" | "subtree";

export type ExpandCollapseButtonController = {
  collapsedTreeNodeIds: Set<string>;
  buttonsByTreeNodeId: Map<string, HTMLButtonElement>;
  spinnersByTreeNodeId: Map<string, HTMLImageElement>;
  overlay: HTMLDivElement;
};
