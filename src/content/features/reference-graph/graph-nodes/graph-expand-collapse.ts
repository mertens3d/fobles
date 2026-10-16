// @source-path [fobles] src/content/features/reference-graph/graph-nodes/graph-expand-collapse.ts

import type cytoscape from "cytoscape";
import type {
  SitecoreHarvestFiltersState,
} from "../../../sitecore-harvester/sitecore-harvester.types";
import type {
  LayoutGraphPresetName,
} from "../graph.types";
import {
  getExpandedByCollapseKey,
  setExpandedStateForCollapseKey,
} from "./graph-collapse-settings";
import {
  isGraphCollapseKey,
  type ExpandedByCollapseKey,
  type GraphCollapseKey,
} from "./graph-collapse.types";
import {
  applyGraphVisibility,
  createExpandCollapseOverlay,
  positionExpandCollapseControls,
  readChildTreeNodeIds,
  removeMissingCollapsedTreeNodeIds,
  synchronizeExpandCollapseControls,
} from "./graph-expand-collapse-view";

type GraphExpandCollapseController = {
  collapsedTreeNodeIds: Set<string>;
  expandedByCollapseKey:
  ExpandedByCollapseKey | undefined;
  overlay: HTMLDivElement;
  buttonsByTreeNodeId:
  Map<string, HTMLButtonElement>;
  getCurrentFilters:
  () => SitecoreHarvestFiltersState;
  getCurrentLayoutPresetName:
  () => LayoutGraphPresetName;
  updateControls: () => void;
};

const controllerByCore =
  new WeakMap<
    cytoscape.Core,
    GraphExpandCollapseController
  >();

export async function attachGraphExpandCollapse(
  cy: cytoscape.Core,
  container: HTMLElement,
  getCurrentFilters:
    () => SitecoreHarvestFiltersState,
  getCurrentLayoutPresetName:
    () => LayoutGraphPresetName,
): Promise<void> {
  detachGraphExpandCollapse(cy);

  const overlay =
    createExpandCollapseOverlay(
      container,
    );

  const controller:
    GraphExpandCollapseController = {
    collapsedTreeNodeIds:
      new Set<string>(),
    expandedByCollapseKey: undefined,
    overlay,
    buttonsByTreeNodeId:
      new Map<string, HTMLButtonElement>(),
    getCurrentFilters,
    getCurrentLayoutPresetName,
    updateControls:
      () => undefined,
  };

  controller.updateControls =
    (): void => {
      synchronizeExpandCollapseControls(
        cy,
        controller,
        (
          treeNodeId,
          recursivelyExpand,
        ) => {
          toggleGraphNodeCollapsed(
            cy,
            treeNodeId,
            recursivelyExpand,
          );
        },
      );

      positionExpandCollapseControls(
        cy,
        controller,
      );
    };

  controllerByCore.set(
    cy,
    controller,
  );

  cy.on(
    [
      "render",
      "position",
      "pan",
      "zoom",
      "resize",
      "layoutstop",
      "add",
      "remove",
    ].join(" "),
    controller.updateControls,
  );

  controller.expandedByCollapseKey =
    await getExpandedByCollapseKey();

  initializeCollapsedTreeNodeIds(
    cy,
    controller,
  );

  refreshGraphExpandCollapse(cy);
}

export function initializeGraphCollapseState(
  cy: cytoscape.Core,
): void {
  const controller =
    controllerByCore.get(cy);

  if (
    controller &&
    controller.expandedByCollapseKey
  ) {
    initializeCollapsedTreeNodeIds(
      cy,
      controller,
    );

    refreshGraphExpandCollapse(cy);
  }
}

export function refreshGraphExpandCollapse(
  cy: cytoscape.Core,
): void {
  const controller =
    controllerByCore.get(cy);

  if (controller) {
    removeMissingCollapsedTreeNodeIds(
      cy,
      controller.collapsedTreeNodeIds,
    );

    applyGraphVisibility(
      cy,
      controller.collapsedTreeNodeIds,
      controller.getCurrentFilters(),
    );

    controller.updateControls();
  }
}

export function detachGraphExpandCollapse(
  cy: cytoscape.Core,
): void {
  const controller =
    controllerByCore.get(cy);

  if (controller) {
    cy.off(
      [
        "render",
        "position",
        "pan",
        "zoom",
        "resize",
        "layoutstop",
        "add",
        "remove",
      ].join(" "),
      controller.updateControls,
    );

    controller.overlay.remove();

    controller.buttonsByTreeNodeId.clear();

    controllerByCore.delete(cy);
  }
}

function initializeCollapsedTreeNodeIds(
  cy: cytoscape.Core,
  controller:
    GraphExpandCollapseController,
): void {
  const expandedByCollapseKey =
    controller.expandedByCollapseKey;

  if (expandedByCollapseKey) {
    controller.collapsedTreeNodeIds.clear();

    cy.nodes().forEach((node) => {
      const collapseKey =
        readCollapseKey(node);

      if (
        node.data("expandable") === true &&
        collapseKey &&
        !expandedByCollapseKey[
        collapseKey
        ]
      ) {
        controller.collapsedTreeNodeIds.add(
          node.id(),
        );
      }
    });
  }
}
function toggleGraphNodeCollapsed(
  cy: cytoscape.Core,
  treeNodeId: string,
  recursivelyExpand: boolean,
): void {
  const controller = controllerByCore.get(cy);
  const node = cy.getElementById(treeNodeId);

  if (controller && !node.empty()) {
    const currentlyCollapsed =
      controller.collapsedTreeNodeIds.has(treeNodeId);

    if (currentlyCollapsed) {
      controller.collapsedTreeNodeIds.delete(treeNodeId);

      if (recursivelyExpand) {
        expandDescendants(
          cy,
          treeNodeId,
          controller.collapsedTreeNodeIds,
        );
      } else {
        collapseExpandableChildren(
          cy,
          treeNodeId,
          controller.collapsedTreeNodeIds,
        );
      }
    } else if (recursivelyExpand) {
      collapseSameTypeNodes(
        cy,
        treeNodeId,
        controller.collapsedTreeNodeIds,
      );
    } else {
      controller.collapsedTreeNodeIds.add(treeNodeId);
    }

    const expanded =
      !controller.collapsedTreeNodeIds.has(treeNodeId);

    const collapseKey = readCollapseKey(node);

    if (
      collapseKey &&
      controller.expandedByCollapseKey
    ) {
      controller.expandedByCollapseKey[
        collapseKey
      ] = expanded;

      void setExpandedStateForCollapseKey(
        collapseKey,
        expanded,
      );
    }

    refreshGraphExpandCollapse(cy);
  }
}

function collapseExpandableChildren(
  cy: cytoscape.Core,
  treeNodeId: string,
  collapsedTreeNodeIds:
    Set<string>,
): void {
  const node =
    cy.getElementById(
      treeNodeId,
    );

  if (!node.empty()) {
    readChildTreeNodeIds(node).forEach(
      (childTreeNodeId) => {
        const childNode =
          cy.getElementById(
            childTreeNodeId,
          );

        if (
          !childNode.empty() &&
          childNode.data(
            "expandable",
          ) === true
        ) {
          collapsedTreeNodeIds.add(
            childTreeNodeId,
          );
        }
      },
    );
  }
}
function collapseSameTypeNodes(
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
function expandDescendants(
  cy: cytoscape.Core,
  treeNodeId: string,
  collapsedTreeNodeIds:
    Set<string>,
): void {
  const node =
    cy.getElementById(
      treeNodeId,
    );

  if (!node.empty()) {
    readChildTreeNodeIds(node).forEach(
      (childTreeNodeId) => {
        collapsedTreeNodeIds.delete(
          childTreeNodeId,
        );

        expandDescendants(
          cy,
          childTreeNodeId,
          collapsedTreeNodeIds,
        );
      },
    );
  }
}

export function prepareGraphForExpandedLayout(
  cy: cytoscape.Core,
): void {
  cy.elements().style(
    "display",
    "element",
  );
}

function readCollapseKey(
  node: cytoscape.NodeSingular,
): GraphCollapseKey | undefined {
  const value: unknown =
    node.data("collapseKey");

  let collapseKey:
    | GraphCollapseKey
    | undefined = undefined;

  if (isGraphCollapseKey(value)) {
    collapseKey = value;
  }

  return collapseKey;
}

function collapseSameTypeSiblings(
  cy: cytoscape.Core,
  treeNodeId: string,
  collapsedTreeNodeIds: Set<string>,
): void {
  const node = cy.getElementById(treeNodeId);

  if (!node.empty()) {
    collapsedTreeNodeIds.add(treeNodeId);

    const collapseKey = readCollapseKey(node);
    const parentTreeNodeId: unknown =
      node.data("parentTreeNodeId");

    if (
      collapseKey &&
      typeof parentTreeNodeId === "string"
    ) {
      const parentNode =
        cy.getElementById(parentTreeNodeId);

      if (!parentNode.empty()) {
        readChildTreeNodeIds(parentNode).forEach(
          (siblingTreeNodeId) => {
            const siblingNode =
              cy.getElementById(siblingTreeNodeId);

            if (
              !siblingNode.empty() &&
              siblingNode.data("expandable") === true &&
              readCollapseKey(siblingNode) === collapseKey
            ) {
              collapsedTreeNodeIds.add(
                siblingTreeNodeId,
              );
            }
          },
        );
      }
    }
  }
}