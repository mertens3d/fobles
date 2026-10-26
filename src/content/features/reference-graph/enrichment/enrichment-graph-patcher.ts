// @source-path [fobles] src/content/features/reference-graph/enrichment/enrichment-graph-patcher.ts

import type cytoscape from "cytoscape";
import type { ReferenceModelNode } from "../../../foundation/reference-data/model/reference-model.types";
import { getGraphOwnedClasses, projectGraphNode } from "../graph-nodes/graph-node-builder";
import type { ProcessingStateByTreeNodeId } from "../../../foundation/reference-data/processing/processing-state";
import { getGraphPresentationState } from "../../../foundation/reference-data/model/graph-presentation-state";

type ProjectedGraphNodeData = ReturnType<typeof projectGraphNode>["data"];

type NodeRuntimeState = { position: cytoscape.Position; selected: boolean; locked: boolean; grabbable: boolean };

export function patchCytoscapeNodes(
  cy: cytoscape.Core | undefined,
  treeNodeIds: readonly string[],
  nodesById: Map<string, ReferenceModelNode>,
  processingStateByTreeNodeId: ProcessingStateByTreeNodeId,
): void {
  if (!cy || cy.destroyed()) {
    return;
  }

  const graphOwnedClasses = getGraphOwnedClasses();

  const patchedNodes = cy.collection();

  cy.batch(() => {
    for (const treeNodeId of treeNodeIds) {
      const patchedNode = patchCytoscapeNode(cy, treeNodeId, nodesById, processingStateByTreeNodeId, graphOwnedClasses);

      if (patchedNode) {
        patchedNodes.merge(patchedNode);
      }
    }
  });

  if (patchedNodes.nonempty()) {
    recreatePatchedNodes(cy, patchedNodes);
  }
}

function patchCytoscapeNode(
  cy: cytoscape.Core,
  treeNodeId: string,
  nodesById: Map<string, ReferenceModelNode>,
  processingStateByTreeNodeId: ProcessingStateByTreeNodeId,
  graphOwnedClasses: readonly string[],
): cytoscape.NodeSingular | undefined {
  const treeNode = nodesById.get(treeNodeId);

  const element = cy.getElementById(treeNodeId);

  let patchedNode: cytoscape.NodeSingular | undefined = undefined;

  if (treeNode && element.nonempty() && element.isNode()) {
    const node = element.nodes().first();

    const projectedNode = projectGraphNode(treeNode, readParentTreeNodeId(node, treeNode), processingStateByTreeNodeId.get(treeNodeId));

    replaceGraphOwnedClasses(node, graphOwnedClasses, projectedNode.classes);

    updateGraphNodeData(node, projectedNode.data);

    patchedNode = node;
  }

  return patchedNode;
}

function recreatePatchedNodes(cy: cytoscape.Core, nodes: cytoscape.NodeCollection): void {
  const runtimeStateByNodeId = captureNodeRuntimeState(nodes);

  const elementsToRestore = nodes.union(nodes.connectedEdges());

  cy.batch(() => {
    const removedElements = elementsToRestore.remove();

    removedElements.restore();

    restoreNodeRuntimeState(nodes, runtimeStateByNodeId);
  });

  cy.style().update();
}

function captureNodeRuntimeState(nodes: cytoscape.NodeCollection): Map<string, NodeRuntimeState> {
  const runtimeStateByNodeId = new Map<string, NodeRuntimeState>();

  nodes.forEach((node) => {
    runtimeStateByNodeId.set(node.id(), {
      position: { ...node.position() },
      selected: node.selected(),
      locked: node.locked(),
      grabbable: node.grabbable(),
    });
  });

  return runtimeStateByNodeId;
}

function restoreNodeRuntimeState(
  nodes: cytoscape.NodeCollection,
  runtimeStateByNodeId: ReadonlyMap<string, NodeRuntimeState>,
): void {
  nodes.forEach((node) => {
    const runtimeState = runtimeStateByNodeId.get(node.id());

    if (runtimeState) {
      node.position(runtimeState.position);

      if (runtimeState.selected) {
        node.select();
      } else {
        node.unselect();
      }

      if (runtimeState.locked) {
        node.lock();
      } else {
        node.unlock();
      }

      if (runtimeState.grabbable) {
        node.grabify();
      } else {
        node.ungrabify();
      }
    }
  });
}

function replaceGraphOwnedClasses(
  element: cytoscape.NodeSingular,
  graphOwnedClasses: readonly string[],
  projectedClasses: readonly string[],
): void {
  graphOwnedClasses.forEach((className) => {
    element.removeClass(className);
  });

  projectedClasses.forEach((className) => {
    element.addClass(className);
  });
}

function readParentTreeNodeId(element: cytoscape.NodeSingular, treeNode: ReferenceModelNode): string | undefined {
  let parentTreeNodeId: string | undefined = undefined;

  if ((getGraphPresentationState(treeNode).relationshipToParent ?? "contained") === "contained") {
    const parentValue: unknown = element.data("parent");

    if (typeof parentValue === "string") {
      parentTreeNodeId = parentValue;
    }
  }

  return parentTreeNodeId;
}

function updateGraphNodeData(element: cytoscape.NodeSingular, projectedData: ProjectedGraphNodeData): void {
  const { id: _id, parent: _parent, ...mutableData } = projectedData;

  Object.entries(mutableData).forEach(([key, value]) => {
    if (value === undefined) {
      element.removeData(key);
    } else {
      element.data(key, value);
    }
  });
}
