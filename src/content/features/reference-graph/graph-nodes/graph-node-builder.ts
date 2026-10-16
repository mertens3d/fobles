// @source-path [fobles] src/content/features/reference-graph/graph-nodes/graph-node-builder.ts

import type cytoscape from "cytoscape";
import {
  CONST,
} from "../../../../constants/const";
import type {
  DataTreeNode,
} from "../data-tree/data-tree.types";
import {
  kindClass,
} from "./graph-helpers";
import {
  NODE_PRESENTATION_BY_KIND,
} from "./node-presentation";
import {
  resolveNodeLabel,
} from "./node-label-resolver";
import type {
  GraphNodeData,
} from "./graph-node.types";

export type ProjectedGraphNode = {
  data: GraphNodeData;
  classes: string[];
};

export function getGraphOwnedClasses(): string[] {
  const kindClasses = Object.keys(
    NODE_PRESENTATION_BY_KIND,
  ).map((kind) =>
    kindClass(kind),
  );

  const filterClasses: string[] =
    Object.values(
      CONST.FOBLES.REFERENCE_GRAPH
        .FILTER_CLASS,
    );

  return [
    ...kindClasses,
    ...filterClasses,
  ];
}

export function appendGraphNode(
  treeNode: DataTreeNode,
  cytoNodes:
    cytoscape.ElementDefinition[],
  cytoEdges:
    cytoscape.ElementDefinition[],
  parentTreeNodeId?: string,
): void {
  const relationshipToParent =
    treeNode.relationshipToParent ??
    "contained";

  const projectedNode =
    projectGraphNode(
      treeNode,
      parentTreeNodeId,
    );

  cytoNodes.push({
    data: projectedNode.data,
    classes:
      projectedNode.classes.join(" "),
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
            source:
              treeNode.treeNodeId,
            target:
              parentTreeNodeId,
          }
        : {
            id:
              `edge-${parentTreeNodeId}` +
              `-${treeNode.treeNodeId}`,
            source:
              parentTreeNodeId,
            target:
              treeNode.treeNodeId,
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
export function projectGraphNode(
  treeNode: DataTreeNode,
  parentTreeNodeId?: string,
): ProjectedGraphNode {
  const relationshipToParent =
    treeNode.relationshipToParent ?? "contained";

  const renderingParameter =
    treeNode.provenance.type === "rendering-parameter"
      ? treeNode.provenance
      : undefined;

  const graphNodeData: GraphNodeData = {
    id: treeNode.treeNodeId,
    parentTreeNodeId,
    parent:
      relationshipToParent === "contained"
        ? parentTreeNodeId
        : undefined,
    label: resolveNodeLabel(
      treeNode,
      NODE_PRESENTATION_BY_KIND[treeNode.kind],
    ),
    childTreeNodeIds: treeNode.children.map(
      (childTreeNode) => childTreeNode.treeNodeId,
    ),
    expandable: treeNode.children.length > 0,
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
    renderingParameterValue:
      renderingParameter?.parameterValue,
    renderingParameterIsItemReference:
      renderingParameter?.isItemReference,
    enrichmentStatus:
      treeNode.nodeType === "item"
        ? treeNode.enrichmentStatus
        : undefined,
  };

  const classes = [
    kindClass(treeNode.kind),
    getFilterClass(treeNode),
  ].filter(
    (className): className is string =>
      Boolean(className),
  );

  return {
    data: graphNodeData,
    classes,
  };
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
        .FILTER_CLASS[
          treeNode.branch
        ];
  }

  return filterClass;
}