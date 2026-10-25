// @source-path [fobles] src/content/features/reference-model/reference-model-node-lookup.ts

import type { ReferenceModelNode } from "./reference-model.types";

// Authoritative mapping from Cytoscape node id (== treeNodeId) back to the domain data that
// produced it - built once per prepared graph so selection/details resolve through this map
// instead of Cytoscape node.data() carrying the full ReferenceModelNode.
export function buildReferenceModelNodeLookup(
  referenceModel: ReferenceModelNode,
): Map<string, ReferenceModelNode> {
  const nodesById = new Map<string, ReferenceModelNode>();

  collectNodesRecursive(referenceModel, nodesById);

  return nodesById;
}

function collectNodesRecursive(
  treeNode: ReferenceModelNode,
  nodesById: Map<string, ReferenceModelNode>,
): void {
  nodesById.set(treeNode.treeNodeId, treeNode);

  treeNode.children.forEach((childTreeNode) => {
    collectNodesRecursive(childTreeNode, nodesById);
  });
}
