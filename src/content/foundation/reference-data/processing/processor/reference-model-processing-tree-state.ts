// @source-path [fobles] src/content/foundation/reference-data/processing/processor/reference-model-processing-tree-state.ts

import type { ItemGraphNodeData } from "../../model/model.types";
import type { ReferenceModelNode } from "../../model/model.types";
import type { ReferenceModelItemNode } from "../../model/model.types";

export function itemsFor(
  treeNodeIds: readonly string[],
  nodesById: Map<string, ReferenceModelNode>,
): ItemGraphNodeData[] {
  return treeNodeIds
    .map((treeNodeId) => asItemNode(nodesById.get(treeNodeId)))
    .filter((treeNode): treeNode is ReferenceModelItemNode => Boolean(treeNode))
    .map((treeNode) => treeNode.scItem);
}

export function firstItemNode(
  treeNodeIds: readonly string[],
  nodesById: Map<string, ReferenceModelNode>,
): ReferenceModelItemNode | undefined {
  let itemNode: ReferenceModelItemNode | undefined;
  for (const treeNodeId of treeNodeIds) {
    const candidate = asItemNode(nodesById.get(treeNodeId));
    if (candidate && !itemNode) {
      itemNode = candidate;
    }
  }
  return itemNode;
}
function asItemNode(treeNode: ReferenceModelNode | undefined): ReferenceModelItemNode | undefined {
  return treeNode?.nodeType === "item" ? treeNode : undefined;
}
