// @source-path [fobles] src/content/features/reference-graph/graph-nodes/graph-collapse-state.ts

import type cytoscape from "cytoscape";
import {
  isGraphCollapseKey,
  type ExpandedByCollapseKey,
  type GraphCollapseKey,
} from "../../../foundation/reference-data/model/graph-collapse.types";

export function initializeCollapsedTreeNodeIds(
  cy: cytoscape.Core,
  expandedByCollapseKey: ExpandedByCollapseKey,
  collapsedTreeNodeIds: Set<string>,
): void {
  collapsedTreeNodeIds.clear();

  cy.nodes().forEach((node) => {
    const collapseKey = readCollapseKey(node);

    if (
      node.data("expandable") === true &&
      collapseKey &&
      !expandedByCollapseKey[collapseKey]
    ) {
      collapsedTreeNodeIds.add(node.id());
    }
  });
}
function readChildTreeNodeIds(
  node: cytoscape.NodeSingular,
): string[] {
  const value: unknown = node.data("childTreeNodeIds");
  let childTreeNodeIds: string[] = [];

  if (Array.isArray(value)) {
    childTreeNodeIds = value.filter(
      (entry): entry is string =>
        typeof entry === "string",
    );
  }

  return childTreeNodeIds;
}
export function collapseExpandableChildren(
  cy: cytoscape.Core,
  treeNodeId: string,
  collapsedTreeNodeIds: Set<string>,
): void {
  const node = cy.getElementById(treeNodeId);

  if (!node.empty()) {
    readChildTreeNodeIds(node).forEach((childTreeNodeId: string) => {
      const childNode = cy.getElementById(childTreeNodeId);

      if (!childNode.empty() && childNode.data("expandable") === true) {
        collapsedTreeNodeIds.add(childTreeNodeId);
      }
    });
  }
}

export function collapseDescendants(
  cy: cytoscape.Core,
  treeNodeId: string,
  collapsedTreeNodeIds: Set<string>,
): void {
  const node = cy.getElementById(treeNodeId);

  if (!node.empty()) {
    readChildTreeNodeIds(node).forEach((childTreeNodeId: string) => {
      const childNode = cy.getElementById(childTreeNodeId);

      if (!childNode.empty()) {
        if (childNode.data("expandable") === true) {
          collapsedTreeNodeIds.add(childTreeNodeId);
        }

        collapseDescendants(
          cy,
          childTreeNodeId,
          collapsedTreeNodeIds,
        );
      }
    });
  }
}

export function collapseSameTypeNodes(
  cy: cytoscape.Core,
  treeNodeId: string,
  collapsedTreeNodeIds: Set<string>,
): void {
  const node = cy.getElementById(treeNodeId);

  if (!node.empty()) {
    const collapseKey = readCollapseKey(node);

    if (collapseKey) {
      cy.nodes().forEach((candidate) => {
        if (
          candidate.data("expandable") === true &&
          readCollapseKey(candidate) === collapseKey
        ) {
          collapsedTreeNodeIds.add(candidate.id());
        }
      });
    }
  }
}

export function expandDescendants(
  cy: cytoscape.Core,
  treeNodeId: string,
  collapsedTreeNodeIds: Set<string>,
): void {
  const node = cy.getElementById(treeNodeId);

  if (!node.empty()) {
    readChildTreeNodeIds(node).forEach((childTreeNodeId: string) => {
      collapsedTreeNodeIds.delete(childTreeNodeId);

      expandDescendants(
        cy,
        childTreeNodeId,
        collapsedTreeNodeIds,
      );
    });
  }
}

export function expandSameTypeNodes(
  cy: cytoscape.Core,
  treeNodeId: string,
  collapsedTreeNodeIds: Set<string>,
): void {
  const node = cy.getElementById(treeNodeId);

  if (!node.empty()) {
    const collapseKey = readCollapseKey(node);

    if (collapseKey) {
      cy.nodes().forEach((candidate) => {
        if (
          candidate.data("expandable") === true &&
          readCollapseKey(candidate) === collapseKey
        ) {
          collapsedTreeNodeIds.delete(candidate.id());

          collapseExpandableChildren(
            cy,
            candidate.id(),
            collapsedTreeNodeIds,
          );
        }
      });
    }
  }
}

export function readCollapseKey(
  node: cytoscape.NodeSingular,
): GraphCollapseKey | undefined {
  const value: unknown = node.data("collapseKey");
  let collapseKey: GraphCollapseKey | undefined;

  if (isGraphCollapseKey(value)) {
    collapseKey = value;
  }

  return collapseKey;
}