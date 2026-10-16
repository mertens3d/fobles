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
  renderingParameterValue: string | undefined;
  renderingParameterIsItemReference: boolean | undefined;
  enrichmentStatus: EnrichmentStatus | undefined;
};
