import type cytoscape from "cytoscape";
import { CONST } from "../../../../constants/const";
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

  if (
    getComputedStyle(container).position ===
    "static"
  ) {
    container.style.position = "relative";
  }

  const overlay =
    document.createElement("div");

  overlay.className =
    "fobles-reference-graph-expand-collapse-controls";

  overlay.style.cssText = [
    "position:absolute",
    "inset:0",
    "pointer-events:none",
    "z-index:10",
    "overflow:hidden",
  ].join(";");

  container.appendChild(overlay);

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
    updateControls: () => undefined,
  };

  controller.updateControls =
    (): void => {
      synchronizeExpandCollapseControls(
        cy,
        controller,
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

function synchronizeExpandCollapseControls(
  cy: cytoscape.Core,
  controller:
    GraphExpandCollapseController,
): void {
  const expandableTreeNodeIds =
    new Set<string>();

  cy.nodes().forEach((node) => {
    if (node.data("expandable") === true) {
      const treeNodeId = node.id();

      expandableTreeNodeIds.add(
        treeNodeId,
      );

      let button =
        controller.buttonsByTreeNodeId.get(
          treeNodeId,
        );

      if (!button) {
        button =
          createExpandCollapseButton(
            cy,
            treeNodeId,
          );

        controller.buttonsByTreeNodeId.set(
          treeNodeId,
          button,
        );

        controller.overlay.appendChild(
          button,
        );
      }

      const collapsed =
        controller.collapsedTreeNodeIds.has(
          treeNodeId,
        );

      button.textContent =
        collapsed ? "+" : "−";

      button.title = collapsed
        ? "Expand descendants; Ctrl/Cmd-click expands the entire subtree"
        : "Collapse descendants";

      button.setAttribute(
        "aria-label",
        button.title,
      );

      button.dataset.collapsed =
        String(collapsed);
    }
  });

  for (
    const [
      treeNodeId,
      button,
    ] of controller.buttonsByTreeNodeId
  ) {
    if (
      !expandableTreeNodeIds.has(
        treeNodeId,
      )
    ) {
      button.remove();

      controller.buttonsByTreeNodeId.delete(
        treeNodeId,
      );

      controller.collapsedTreeNodeIds.delete(
        treeNodeId,
      );
    }
  }
}
function createExpandCollapseButton(
  cy: cytoscape.Core,
  treeNodeId: string,
): HTMLButtonElement {
  const button =
    document.createElement("button");

  button.type = "button";

  button.className =
    "fobles-reference-graph-expand-collapse-button";

  button.style.cssText = [
    "position:absolute",
    "width:18px",
    "height:18px",
    "padding:0",
    "border:1px solid #2f6fed",
    "border-radius:50%",
    "background:#ffffff",
    "color:#203047",
    "font:700 13px/16px sans-serif",
    "text-align:center",
    "cursor:pointer",
    "pointer-events:auto",
    "box-sizing:border-box",
  ].join(";");

  button.addEventListener(
    "click",
    (event) => {
      event.preventDefault();
      event.stopPropagation();

      toggleGraphNodeCollapsed(
        cy,
        treeNodeId,
        event.ctrlKey ||
        event.metaKey,
      );
    },
  );

  return button;
}

function toggleGraphNodeCollapsed(
  cy: cytoscape.Core,
  treeNodeId: string,
  recursivelyExpand: boolean,
): void {
  const controller =
    controllerByCore.get(cy);

  const node =
    cy.getElementById(treeNodeId);

  if (
    controller &&
    !node.empty()
  ) {
    const currentlyCollapsed =
      controller.collapsedTreeNodeIds.has(
        treeNodeId,
      );

    if (currentlyCollapsed) {
      controller.collapsedTreeNodeIds.delete(
        treeNodeId,
      );

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
    } else {
      controller.collapsedTreeNodeIds.add(
        treeNodeId,
      );
    }

    const expanded =
      !controller.collapsedTreeNodeIds.has(
        treeNodeId,
      );

    const collapseKey =
      readCollapseKey(node);

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
  collapsedTreeNodeIds: Set<string>,
): void {
  const node =
    cy.getElementById(treeNodeId);

  if (!node.empty()) {
    readChildTreeNodeIds(node).forEach(
      (childTreeNodeId) => {
        const childNode =
          cy.getElementById(
            childTreeNodeId,
          );

        if (
          !childNode.empty() &&
          childNode.data("expandable") === true
        ) {
          collapsedTreeNodeIds.add(
            childTreeNodeId,
          );
        }
      },
    );
  }
}

function expandDescendants(
  cy: cytoscape.Core,
  treeNodeId: string,
  collapsedTreeNodeIds: Set<string>,
): void {
  const node =
    cy.getElementById(treeNodeId);

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


function applyGraphVisibility(
  cy: cytoscape.Core,
  collapsedTreeNodeIds:
    ReadonlySet<string>,
  filters:
    SitecoreHarvestFiltersState,
): void {
  const hiddenTreeNodeIds =
    collectCollapsedDescendantIds(
      cy,
      collapsedTreeNodeIds,
    );

  cy.nodes().forEach((node) => {
    if (
      isNodeHiddenByFilter(
        node,
        filters,
      )
    ) {
      hiddenTreeNodeIds.add(
        node.id(),
      );
    }
  });

  cy.nodes().forEach((node) => {
    node.style(
      "display",
      hiddenTreeNodeIds.has(
        node.id(),
      )
        ? "none"
        : "element",
    );
  });

  cy.edges().forEach((edge) => {
    const sourceTreeNodeId =
      edge.data("source") as string;

    const targetTreeNodeId =
      edge.data("target") as string;

    edge.style(
      "display",
      hiddenTreeNodeIds.has(
        sourceTreeNodeId,
      ) ||
        hiddenTreeNodeIds.has(
          targetTreeNodeId,
        )
        ? "none"
        : "element",
    );
  });
}

function isNodeHiddenByFilter(
  node: cytoscape.NodeSingular,
  filters:
    SitecoreHarvestFiltersState,
): boolean {
  let hidden = false;

  CONST.FOBLES.REFERENCE_GRAPH
    .FILTER_DEFS.forEach(
      ({ key, className }) => {
        if (
          !filters[key] &&
          node.hasClass(className)
        ) {
          hidden = true;
        }
      },
    );

  return hidden;
}

function collectCollapsedDescendantIds(
  cy: cytoscape.Core,
  collapsedTreeNodeIds:
    ReadonlySet<string>,
): Set<string> {
  const descendantTreeNodeIds =
    new Set<string>();

  collapsedTreeNodeIds.forEach(
    (collapsedTreeNodeId) => {
      collectDescendantTreeNodeIds(
        cy,
        collapsedTreeNodeId,
        descendantTreeNodeIds,
      );
    },
  );

  return descendantTreeNodeIds;
}

function collectDescendantTreeNodeIds(
  cy: cytoscape.Core,
  treeNodeId: string,
  descendantTreeNodeIds:
    Set<string>,
): void {
  const treeNode =
    cy.getElementById(treeNodeId);

  if (!treeNode.empty()) {
    const childTreeNodeIds =
      readChildTreeNodeIds(treeNode);

    childTreeNodeIds.forEach(
      (childTreeNodeId) => {
        if (
          !descendantTreeNodeIds.has(
            childTreeNodeId,
          )
        ) {
          descendantTreeNodeIds.add(
            childTreeNodeId,
          );

          collectDescendantTreeNodeIds(
            cy,
            childTreeNodeId,
            descendantTreeNodeIds,
          );
        }
      },
    );
  }
}

function readChildTreeNodeIds(
  node:
    cytoscape.NodeSingular,
): string[] {
  const value: unknown =
    node.data("childTreeNodeIds");

  let childTreeNodeIds: string[] = [];

  if (Array.isArray(value)) {
    childTreeNodeIds = value.filter(
      (entry): entry is string =>
        typeof entry === "string",
    );
  }

  return childTreeNodeIds;
}

function readCollapseKey(
  node:
    cytoscape.NodeSingular
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

function removeMissingCollapsedTreeNodeIds(
  cy: cytoscape.Core,
  collapsedTreeNodeIds:
    Set<string>,
): void {
  collapsedTreeNodeIds.forEach(
    (treeNodeId) => {
      if (
        cy.getElementById(
          treeNodeId,
        ).empty()
      ) {
        collapsedTreeNodeIds.delete(
          treeNodeId,
        );
      }
    },
  );
}

function positionExpandCollapseControls(
  cy: cytoscape.Core,
  controller:
    GraphExpandCollapseController,
): void {
  controller.buttonsByTreeNodeId.forEach(
    (button, treeNodeId) => {
      const node =
        cy.getElementById(treeNodeId);

      if (
        node.empty() ||
        node.style("display") ===
        "none"
      ) {
        button.style.display = "none";
      } else {
        const bounds =
          node.renderedBoundingBox({
            includeLabels: false,
            includeOverlays: false,
          });

        button.style.display = "block";
        button.style.left =
          `${bounds.x2 - 7}px`;
        button.style.top =
          `${bounds.y1 - 7}px`;
      }
    },
  );
}