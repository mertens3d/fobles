// @source-path [fobles] src/content/features/reference-graph/prepared-reference-graph.types.ts

import type cytoscape from "cytoscape";
import type { SitecoreHarvestResult } from "../../foundation/harvesting/sitecore-harvester.types";
import type { ReferenceModelNode } from "../../foundation/reference-data/model/reference-model.types";
import type { ProcessingStateByTreeNodeId } from "../../shared/reference-model-processing/processing-state";

// The fully prepared graph: the authoritative aggregate React state owns, replacing the old
// "harvest result + throwaway Cytoscape elements" pair. The enriched reference model is retained
// alongside the harvested data and projected elements instead of disappearing after projection.
export type PreparedReferenceGraph = {
  harvestedData: SitecoreHarvestResult;
  referenceModel: ReferenceModelNode;
  nodesById: Map<string, ReferenceModelNode>;
  graphElements: cytoscape.ElementDefinition[];
  processingStateByTreeNodeId: ProcessingStateByTreeNodeId;
};
