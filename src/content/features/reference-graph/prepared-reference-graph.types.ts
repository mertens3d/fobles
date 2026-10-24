// @source-path [fobles] src/content/features/reference-graph/prepared-reference-graph.types.ts

import type cytoscape from "cytoscape";
import type { SitecoreHarvestResult } from "../../sitecore-harvester/sitecore-harvester.types";
import type { DataTreeNode } from "./data-tree/data-tree.types";
import type { ProcessingStateByTreeNodeId } from "./lifecycle/processing-state";

// The fully prepared graph: the authoritative aggregate React state owns, replacing the old
// "harvest result + throwaway Cytoscape elements" pair. The enriched data tree is retained
// alongside the harvested data and projected elements instead of disappearing after projection.
export type PreparedReferenceGraph = {
  harvestedData: SitecoreHarvestResult;
  dataTree: DataTreeNode;
  nodesById: Map<string, DataTreeNode>;
  graphElements: cytoscape.ElementDefinition[];
  processingStateByTreeNodeId: ProcessingStateByTreeNodeId;
};
