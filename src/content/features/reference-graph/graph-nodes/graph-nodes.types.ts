import type { SitecoreHarvestFiltersState } from "../../../../constants/_base/_REFERENCE_GRAPH_BASE";
import type { LayoutGraphPresetName } from "../../../../constants/LayoutGraphPresetName.types";
import type { ExpandedByCollapseKey, GraphCollapseKey } from "../../../foundation/reference-data/model/graph-collapse.types";
import type { ProcessingStatus } from "../../../foundation/reference-data/processing/processing.types";
import type { runGraphLayout } from "../cytoscape/graph-layout";

export type GraphExpandCollapseController = ExpandCollapseButtonController & {
  expandedByCollapseKey: ExpandedByCollapseKey | undefined;
  getCurrentFilters: () => SitecoreHarvestFiltersState;
  getCurrentLayoutPresetName: () => LayoutGraphPresetName;
  getRootTreeNodeId: () => string;
  updateControls: () => void;
};

export type CompoundGroupDefinition = {
  idSuffix: string;
  rootCollapseKey: GraphCollapseKey;
  memberCollapseKeys: readonly GraphCollapseKey[];
  includeMemberDescendants?: boolean;
};

export type AppendGraphNodeOptions = {
  semanticParentTreeNodeId?: string;
  compoundParentNodeId?: string;
  propagateCompoundParent?: boolean;
};

export type ProjectedGraphNode = { data: GraphNodeData; classes: string[] };

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
  enrichmentStatus: ProcessingStatus | undefined;
};

export type ExpandCollapseAction = "single" | "same-kind" | "subtree";

export type ExpandCollapseButtonController = {
  collapsedTreeNodeIds: Set<string>;
  buttonsByTreeNodeId: Map<string, HTMLButtonElement>;
  spinnersByTreeNodeId: Map<string, HTMLImageElement>;
  overlay: HTMLDivElement;
};

export type GraphVisibilityLayoutContext = {
  getCurrentLayoutPresetName: () => Parameters<typeof runGraphLayout>[1];
  getRootTreeNodeId: () => string;
  refreshVisibility: () => void;
};
