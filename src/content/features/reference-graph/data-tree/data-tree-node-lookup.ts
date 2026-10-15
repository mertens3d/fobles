// @source-path [fobles] src/content/features/reference-graph/data-tree/data-tree-node-lookup.ts

import type { DataTreeNode } from "./data-tree.types";

// Authoritative mapping from Cytoscape node id (== treeNodeId) back to the domain data that
// produced it - built once per prepared graph so selection/details resolve through this map
// instead of Cytoscape node.data() carrying the full DataTreeNode.
export function buildDataTreeNodeLookup(
  dataTree: DataTreeNode,
): Map<string, DataTreeNode> {
  const nodesById = new Map<string, DataTreeNode>();

  collectNodesRecursive(dataTree, nodesById);

  return nodesById;
}

function collectNodesRecursive(
  treeNode: DataTreeNode,
  nodesById: Map<string, DataTreeNode>,
): void {
  nodesById.set(treeNode.treeNodeId, treeNode);

  treeNode.children.forEach((childTreeNode) => {
    collectNodesRecursive(childTreeNode, nodesById);
  });
}
