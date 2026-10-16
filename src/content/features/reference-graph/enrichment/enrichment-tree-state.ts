// @source-path [fobles] src/content/features/reference-graph/enrichment/enrichment-tree-state.ts

import type {
  ItemGraphNodeData,
} from "../../../sitecore-harvester/sitecore-harvester.types";
import type {
  DataTreeItemNode,
  DataTreeNode,
  EnrichmentStatus,
} from "../data-tree/data-tree.types";

export function markTreeNodes(
  guids: readonly string[],
  guidLookup: Map<string, string[]>,
  nodesById: Map<string, DataTreeNode>,
  status: EnrichmentStatus,
): void {
  for (const guid of guids) {
    for (
      const treeNodeId of
      guidLookup.get(guid) ?? []
    ) {
      const treeNode =
        asItemNode(
          nodesById.get(treeNodeId),
        );

      if (treeNode) {
        treeNode.enrichmentStatus =
          status;
      }
    }
  }
}

export function itemsFor(
  treeNodeIds: readonly string[],
  nodesById: Map<string, DataTreeNode>,
): ItemGraphNodeData[] {
  const items =
    treeNodeIds
      .map((treeNodeId) =>
        asItemNode(
          nodesById.get(treeNodeId),
        ),
      )
      .filter(
        (
          treeNode,
        ): treeNode is DataTreeItemNode =>
          Boolean(treeNode),
      )
      .map(
        (treeNode) =>
          treeNode.scItem,
      );

  return items;
}

export function firstItemNode(
  treeNodeIds: readonly string[],
  nodesById: Map<string, DataTreeNode>,
): DataTreeItemNode | undefined {
  let itemNode:
    | DataTreeItemNode
    | undefined = undefined;

  for (const treeNodeId of treeNodeIds) {
    const treeNode =
      asItemNode(
        nodesById.get(treeNodeId),
      );

    if (
      treeNode &&
      !itemNode
    ) {
      itemNode = treeNode;
    }
  }

  return itemNode;
}

function asItemNode(
  treeNode:
    | DataTreeNode
    | undefined,
): DataTreeItemNode | undefined {
  let itemNode:
    | DataTreeItemNode
    | undefined = undefined;

  if (
    treeNode?.nodeType === "item"
  ) {
    itemNode = treeNode;
  }

  return itemNode;
}