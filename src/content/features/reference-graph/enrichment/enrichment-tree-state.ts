// @source-path [fobles] src/content/features/reference-graph/enrichment/enrichment-tree-state.ts
import type { ItemGraphNodeData } from "../../../sitecore-harvester/sitecore-harvester.types";
import type { DataTreeItemNode, DataTreeNode } from "../data-tree/data-tree.types";
export function itemsFor(treeNodeIds: readonly string[], nodesById: Map<string, DataTreeNode>): ItemGraphNodeData[] {
  return treeNodeIds.map((treeNodeId) => asItemNode(nodesById.get(treeNodeId))).filter((treeNode): treeNode is DataTreeItemNode => Boolean(treeNode)).map((treeNode) => treeNode.scItem);
}
export function firstItemNode(treeNodeIds: readonly string[], nodesById: Map<string, DataTreeNode>): DataTreeItemNode | undefined {
  let itemNode: DataTreeItemNode | undefined;
  for (const treeNodeId of treeNodeIds) {
    const candidate = asItemNode(nodesById.get(treeNodeId));
    if (candidate && !itemNode) itemNode = candidate;
  }
  return itemNode;
}
function asItemNode(treeNode: DataTreeNode | undefined): DataTreeItemNode | undefined { return treeNode?.nodeType === "item" ? treeNode : undefined; }
