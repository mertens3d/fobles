// @source-path [fobles] src/content/features/reference-graph/graph-nodes/graph-elements.ts

import type cytoscape from "cytoscape";
import type { DataTreeNode } from "../data-tree/data-tree.types";
import { appendGraphNode } from "./graph-node-builder";
import type { ProcessingStateByTreeNodeId } from "../lifecycle/processing-state";

export function projectDataTreeToGraphElements(
  dataTree: DataTreeNode,
  processingStateByTreeNodeId: ProcessingStateByTreeNodeId,
): cytoscape.ElementDefinition[] {
  const cytoNodes: cytoscape.ElementDefinition[] = [];
  const cytoEdges: cytoscape.ElementDefinition[] = [];

  appendGraphNode(
    dataTree,
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