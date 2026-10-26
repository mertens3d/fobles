// @source-path [fobles] src/content/features/reference-graph/graph-nodes/graph-elements.ts

import type cytoscape from "cytoscape";
import type { ReferenceModelNode } from "../../../foundation/reference-data/model/reference-model.types";
import { appendGraphNode } from "./graph-node-builder";
import type { ProcessingStateByTreeNodeId } from "../../../shared/reference-model-processing/processing-state";

export function projectReferenceModelToGraphElements(
  referenceModel: ReferenceModelNode,
  processingStateByTreeNodeId: ProcessingStateByTreeNodeId,
): cytoscape.ElementDefinition[] {
  const cytoNodes: cytoscape.ElementDefinition[] = [];
  const cytoEdges: cytoscape.ElementDefinition[] = [];

  appendGraphNode(
    referenceModel,
    cytoNodes,
    cytoEdges,
    undefined,
    processingStateByTreeNodeId,
  );

  return [
    ...cytoNodes,
    ...cytoEdges,
  ];
}