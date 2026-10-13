// @source-path [fobles] src/content/toolbar/reference-graph/graph-nodes/graph-node-builder.ts

import type cytoscape from "cytoscape";
import { CONST } from "../../../../constants/const";
import type { DataTreeNode } from "../data-tree/data-tree.types";
import { buildLabel } from "../cytoscape/graph-node-helpers";
import { kindClass } from "./graph-helpers";
import type { TooltipData } from "./graph-node.types";

export function appendGraphNode(
  treeNode: DataTreeNode,
  cytoNodes: cytoscape.ElementDefinition[],
  cytoEdges: cytoscape.ElementDefinition[],
  parentTreeNodeId?: string,
): void {
  const relationshipToParent =
    treeNode.relationshipToParent ?? "contained";

  cytoNodes.push({
    data: {
      id: treeNode.treeNodeId,
      parent:
        relationshipToParent === "contained"
          ? parentTreeNodeId
          : undefined,
      label: createTreeNodeLabel(treeNode),
      itemId:
        treeNode.nodeType === "item"
          ? treeNode.scItem.scItemId
          : undefined,
      path:
        treeNode.nodeType === "item"
          ? treeNode.scItem.scItemPath
          : undefined,
      link:
        treeNode.nodeType === "item"
          ? treeNode.scItem.link
          : undefined,
      drillDown:
        treeNode.nodeType === "item"
          ? Boolean(treeNode.scItem.link)
          : false,
      tooltip: createTreeNodeTooltip(treeNode),
    },
    classes: [
      kindClass(treeNode.kind),
      getFilterClass(treeNode),
    ]
      .filter(Boolean)
      .join(" "),
  });

  if (
    parentTreeNodeId &&
    relationshipToParent === "related"
  ) {
    cytoEdges.push({
      data: treeNode.reverse
        ? {
            id: `edge-${treeNode.treeNodeId}-${parentTreeNodeId}`,
            source: treeNode.treeNodeId,
            target: parentTreeNodeId,
          }
        : {
            id: `edge-${parentTreeNodeId}-${treeNode.treeNodeId}`,
            source: parentTreeNodeId,
            target: treeNode.treeNodeId,
          },
    });
  }

  treeNode.children.forEach((childTreeNode) => {
    appendGraphNode(
      childTreeNode,
      cytoNodes,
      cytoEdges,
      treeNode.treeNodeId,
    );
  });
}

function getFilterClass(
  treeNode: DataTreeNode,
): string | undefined {
  if (!treeNode.branch) {
    return undefined;
  }

  return CONST.FOBLES.REFERENCE_GRAPH.FILTER_CLASS[
    treeNode.branch
  ];
}

function createTreeNodeTooltip(
  treeNode: DataTreeNode,
): TooltipData {
  if (treeNode.nodeType === "item") {
    return {
      name: treeNode.scItem.scItemName,
      guid: treeNode.scItem.scItemId,
      path: treeNode.scItem.scItemPath,
      placeholder: undefined,
    };
  }

  return {
    name: treeNode.name,
    guid: undefined,
    path: undefined,
    placeholder: undefined,
  };
}

function createTreeNodeLabel(
  treeNode: DataTreeNode,
): string {
  if (treeNode.nodeType === "nonItem") {
    return treeNode.name;
  }

  const itemName =
    treeNode.scItem.scItemName ??
    treeNode.scItem.scItemId ??
    "Unknown item";

  if (
    treeNode.kind ===
    CONST.FOBLES.REFERENCE_GRAPH.NODE_KIND.DEVICE
  ) {
    return buildLabel(
      treeNode.kind,
      itemName,
    );
  }

  if (
    treeNode.kind ===
    CONST.FOBLES.REFERENCE_GRAPH.NODE_KIND.DATASOURCE
  ) {
    return `Datasource: ${itemName}`;
  }

  return itemName;
}