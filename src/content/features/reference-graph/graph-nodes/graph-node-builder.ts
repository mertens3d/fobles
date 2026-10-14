// @source-path [fobles] src/content/features/reference-graph/graph-nodes/graph-node-builder.ts

import type cytoscape from "cytoscape";
import { CONST } from "../../../../constants/const";
import type {
  DataTreeNode,
} from "../data-tree/data-tree.types";
import {
  buildLabel,
} from "../cytoscape/graph-node-helpers";
import {
  kindClass,
} from "./graph-helpers";
import type {
  GraphNodeData,
  TooltipData,
} from "./graph-node.types";

export function appendGraphNode(
  treeNode: DataTreeNode,
  cytoNodes: cytoscape.ElementDefinition[],
  cytoEdges: cytoscape.ElementDefinition[],
  parentTreeNodeId?: string,
): void {
  const relationshipToParent =
    treeNode.relationshipToParent ??
    "contained";

  const graphNodeData: GraphNodeData = {
    id: treeNode.treeNodeId,
    parent:
      relationshipToParent === "contained"
        ? parentTreeNodeId
        : undefined,
    label: createTreeNodeLabel(treeNode),
    childTreeNodeIds: treeNode.children.map(
      (childTreeNode) =>
        childTreeNode.treeNodeId,
    ),
    expandable:
      treeNode.children.length > 0,
    collapseKey: treeNode.collapseKey,
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
    tooltip:
      createTreeNodeTooltip(treeNode),
  };

  cytoNodes.push({
    data: graphNodeData,
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
            id:
              `edge-${treeNode.treeNodeId}` +
              `-${parentTreeNodeId}`,
            source: treeNode.treeNodeId,
            target: parentTreeNodeId,
          }
        : {
            id:
              `edge-${parentTreeNodeId}` +
              `-${treeNode.treeNodeId}`,
            source: parentTreeNodeId,
            target: treeNode.treeNodeId,
          },
    });
  }

  treeNode.children.forEach(
    (childTreeNode) => {
      appendGraphNode(
        childTreeNode,
        cytoNodes,
        cytoEdges,
        treeNode.treeNodeId,
      );
    },
  );
}

function getFilterClass(
  treeNode: DataTreeNode,
): string | undefined {
  let filterClass:
    | string
    | undefined = undefined;

  if (treeNode.branch) {
    filterClass =
      CONST.FOBLES.REFERENCE_GRAPH
        .FILTER_CLASS[treeNode.branch];
  }

  return filterClass;
}

function createTreeNodeTooltip(
  treeNode: DataTreeNode,
): TooltipData {
  let tooltip: TooltipData;

  if (treeNode.nodeType === "item") {
    tooltip = {
      name: treeNode.scItem.scItemName,
      guid: treeNode.scItem.scItemId,
      path: treeNode.scItem.scItemPath,
      placeholder: undefined,
    };
  } else {
    tooltip = {
      name: treeNode.name,
      guid: undefined,
      path: undefined,
      placeholder: undefined,
    };
  }

  return tooltip;
}

function createTreeNodeLabel(
  treeNode: DataTreeNode,
): string {
  let label: string;

  if (treeNode.nodeType === "nonItem") {
    label = treeNode.name;
  } else {
    const itemName =
      treeNode.scItem.scItemName ??
      treeNode.scItem.scItemId ??
      "Unknown item";

    if (
      treeNode.kind ===
      CONST.FOBLES.REFERENCE_GRAPH
        .NODE_KIND.DEVICE
    ) {
      label = buildLabel(
        treeNode.kind,
        itemName,
      );
    } else if (
      treeNode.kind ===
      CONST.FOBLES.REFERENCE_GRAPH
        .NODE_KIND.DATASOURCE
    ) {
      label = `ds: ${itemName}`;
    } else {
      label = itemName;
    }
  }

  return label;
}