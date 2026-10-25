// @source-path [fobles] src/content/features/reference-graph/graph-nodes/graph-expand-collapse.ts

import type cytoscape from "cytoscape";
import type { SitecoreHarvestFiltersState } from "../../../foundation/harvesting/sitecore-harvester.types";
import type { LayoutGraphPresetName } from "../graph.types";
import { getExpandedByCollapseKey, setExpandedStateForCollapseKey } from "./graph-collapse-settings";
import {
  collapseDescendants,
  collapseExpandableChildren,
  collapseSameTypeNodes,
  expandDescendants,
  expandSameTypeNodes,
  initializeCollapsedTreeNodeIds,
  readCollapseKey,
} from "./graph-collapse-state";
import type { ExpandedByCollapseKey } from "./graph-collapse.types";
import {
  applyGraphVisibility,
  createExpandCollapseOverlay,
  positionExpandCollapseControls,
  removeMissingCollapsedTreeNodeIds,
  synchronizeExpandCollapseControls,
} from "./graph-expand-collapse-view";
import { type ExpandCollapseAction, type ExpandCollapseButtonController } from "./graph-node.types";
import {
  runInitialVisibilityLayout,
  runVisibilityLayout,
  type GraphVisibilityLayoutContext,
} from "./graph-visibility-layout";

type GraphExpandCollapseController = ExpandCollapseButtonController & {
  expandedByCollapseKey: ExpandedByCollapseKey | undefined;
  getCurrentFilters: () => SitecoreHarvestFiltersState;
  getCurrentLayoutPresetName: () => LayoutGraphPresetName;
  getRootTreeNodeId: () => string;
  updateControls: () => void;
};

const CONTROL_EVENTS = ["render", "position", "pan", "zoom", "resize", "layoutstop", "add", "remove", "data"].join(" ");

const controllerByCore = new WeakMap<cytoscape.Core, GraphExpandCollapseController>();

function refreshGraphVisibility(cy: cytoscape.Core, controller: GraphExpandCollapseController): void {
  removeMissingCollapsedTreeNodeIds(cy, controller.collapsedTreeNodeIds);

  applyGraphVisibility(cy, controller.collapsedTreeNodeIds, controller.getCurrentFilters());

  controller.updateControls();
}

function createLayoutContext(
  cy: cytoscape.Core,
  controller: GraphExpandCollapseController,
): GraphVisibilityLayoutContext {
  return {
    getCurrentLayoutPresetName: controller.getCurrentLayoutPresetName,
    getRootTreeNodeId: controller.getRootTreeNodeId,
    refreshVisibility: () => {
      refreshGraphVisibility(cy, controller);
    },
  };
}

export async function attachGraphExpandCollapse(
  cy: cytoscape.Core,
  container: HTMLElement,
  getCurrentFilters: () => SitecoreHarvestFiltersState,
  getCurrentLayoutPresetName: () => LayoutGraphPresetName,
  getRootTreeNodeId: () => string,
): Promise<void> {
  detachGraphExpandCollapse(cy);

  const controller: GraphExpandCollapseController = {
    collapsedTreeNodeIds: new Set<string>(),
    expandedByCollapseKey: undefined,
    overlay: createExpandCollapseOverlay(container),
    buttonsByTreeNodeId: new Map<string, HTMLButtonElement>(),
    spinnersByTreeNodeId: new Map<string, HTMLImageElement>(),
    getCurrentFilters,
    getCurrentLayoutPresetName,
    getRootTreeNodeId,
    updateControls: () => undefined,
  };

  controller.updateControls = (): void => {
    synchronizeExpandCollapseControls(cy, controller, (treeNodeId, action) => {
      toggleGraphNodeCollapsed(cy, treeNodeId, action);
    });

    positionExpandCollapseControls(cy, controller);
  };

  controllerByCore.set(cy, controller);
  cy.on(CONTROL_EVENTS, controller.updateControls);

  controller.expandedByCollapseKey = await getExpandedByCollapseKey();

  if (controller.expandedByCollapseKey) {
    initializeCollapsedTreeNodeIds(cy, controller.expandedByCollapseKey, controller.collapsedTreeNodeIds);
  }

  refreshGraphVisibility(cy, controller);
}

export function initializeGraphCollapseState(cy: cytoscape.Core): void {
  const controller = controllerByCore.get(cy);

  if (controller?.expandedByCollapseKey) {
    initializeCollapsedTreeNodeIds(cy, controller.expandedByCollapseKey, controller.collapsedTreeNodeIds);

    refreshGraphVisibility(cy, controller);
  }
}

export function refreshGraphExpandCollapse(cy: cytoscape.Core): void {
  const controller = controllerByCore.get(cy);

  if (controller) {
    refreshGraphVisibility(cy, controller);
  }
}

export function layoutInitialGraphVisibility(cy: cytoscape.Core, onComplete?: () => void): void {
  const controller = controllerByCore.get(cy);

  if (controller) {
    runInitialVisibilityLayout(cy, createLayoutContext(cy, controller), onComplete);
  } else {
    onComplete?.();
  }
}

export function refreshGraphVisibilityAndLayout(cy: cytoscape.Core, onComplete?: () => void): void {
  const controller = controllerByCore.get(cy);

  if (controller) {
    runVisibilityLayout(cy, createLayoutContext(cy, controller), onComplete);
  } else {
    onComplete?.();
  }
}

export function detachGraphExpandCollapse(cy: cytoscape.Core): void {
  const controller = controllerByCore.get(cy);

  if (controller) {
    cy.off(CONTROL_EVENTS, controller.updateControls);

    controller.overlay.remove();
    controller.buttonsByTreeNodeId.clear();
    controller.spinnersByTreeNodeId.clear();
    controllerByCore.delete(cy);
  }
}

function updatePersistedCollapseKeyState(
  controller: GraphExpandCollapseController,
  node: cytoscape.NodeSingular,
  expanded: boolean,
): void {
  const collapseKey = readCollapseKey(node);

  if (collapseKey && controller.expandedByCollapseKey) {
    controller.expandedByCollapseKey[collapseKey] = expanded;

    void setExpandedStateForCollapseKey(collapseKey, expanded);
  }
}

function toggleGraphNodeCollapsed(cy: cytoscape.Core, treeNodeId: string, action: ExpandCollapseAction): void {
  const controller = controllerByCore.get(cy);
  const node = cy.getElementById(treeNodeId);

  if (controller && !node.empty()) {
    const currentlyCollapsed = controller.collapsedTreeNodeIds.has(treeNodeId);

    if (currentlyCollapsed) {
      if (action === "same-kind") {
        expandSameTypeNodes(cy, treeNodeId, controller.collapsedTreeNodeIds);

        updatePersistedCollapseKeyState(controller, node, true);
      } else {
        controller.collapsedTreeNodeIds.delete(treeNodeId);

        if (action === "subtree") {
          expandDescendants(cy, treeNodeId, controller.collapsedTreeNodeIds);
        } else {
          collapseExpandableChildren(cy, treeNodeId, controller.collapsedTreeNodeIds);
        }
      }
    } else if (action === "same-kind") {
      collapseSameTypeNodes(cy, treeNodeId, controller.collapsedTreeNodeIds);

      updatePersistedCollapseKeyState(controller, node, false);
    } else {
      controller.collapsedTreeNodeIds.add(treeNodeId);

      if (action === "subtree") {
        collapseDescendants(cy, treeNodeId, controller.collapsedTreeNodeIds);
      }
    }

    refreshGraphVisibilityAndLayout(cy);
  }
}
