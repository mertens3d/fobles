// @source-path [fobles] src/content/features/reference-graph/graph-nodes/graph-expand-collapse-view.ts

import type cytoscape from "cytoscape";
import { CONST } from "../../../../constants/const";
import type { SitecoreHarvestFiltersState } from "../../../sitecore-harvester/sitecore-harvester.types";
import {
  DEFAULT_GRAPH_PARAMETER_VISIBILITY_SETTINGS,
  type GraphParameterVisibilitySettings,
} from "../graph-parameter-visibility-settings";
import { GRAPH_COLLAPSE_KEY } from "./graph-collapse.types";

export type ExpandCollapseButtonController = {
  collapsedTreeNodeIds: Set<string>;
  buttonsByTreeNodeId: Map<string, HTMLButtonElement>;
  overlay: HTMLDivElement;
};

const PARAMETER_VISIBILITY_SCRATCH_KEY =
  "_foblesParameterVisibilitySettings";

export function setGraphParameterVisibility(
  cy: cytoscape.Core,
  settings: GraphParameterVisibilitySettings,
): void {
  cy.scratch(
    PARAMETER_VISIBILITY_SCRATCH_KEY,
    settings,
  );
}

export function createExpandCollapseOverlay(
  container: HTMLElement,
): HTMLDivElement {
  if (getComputedStyle(container).position === "static") {
    container.style.position = "relative";
  }

  const overlay = document.createElement("div");

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

  return overlay;
}

export function synchronizeExpandCollapseControls(
  cy: cytoscape.Core,
  controller: ExpandCollapseButtonController,
  onToggle: (
    treeNodeId: string,
    recursivelyExpand: boolean,
  ) => void,
): void {
  const expandableTreeNodeIds =
    new Set<string>();

  cy.nodes().forEach((node) => {
    if (node.data("expandable") === true) {
      const treeNodeId = node.id();

      expandableTreeNodeIds.add(treeNodeId);

      let button =
        controller.buttonsByTreeNodeId.get(
          treeNodeId,
        );

      if (!button) {
        button = createExpandCollapseButton(
          treeNodeId,
          onToggle,
        );

        controller.buttonsByTreeNodeId.set(
          treeNodeId,
          button,
        );

        controller.overlay.appendChild(button);
      }

      const collapsed =
        controller.collapsedTreeNodeIds.has(
          treeNodeId,
        );

      button.textContent = collapsed ? "+" : "−";

      button.title = collapsed
        ? "Expand descendants; Ctrl/Cmd-click expands the entire subtree"
        : "Collapse descendants; Ctrl/Cmd-click collapses same-type siblings";

      button.setAttribute(
        "aria-label",
        button.title,
      );

      button.dataset.collapsed =
        String(collapsed);
    }
  });

  for (
    const [treeNodeId, button] of
    controller.buttonsByTreeNodeId
  ) {
    if (!expandableTreeNodeIds.has(treeNodeId)) {
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
  treeNodeId: string,
  onToggle: (
    treeNodeId: string,
    recursivelyExpand: boolean,
  ) => void,
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

      onToggle(
        treeNodeId,
        event.ctrlKey || event.metaKey,
      );
    },
  );

  return button;
}

export function positionExpandCollapseControls(
  cy: cytoscape.Core,
  controller: ExpandCollapseButtonController,
): void {
  controller.buttonsByTreeNodeId.forEach(
    (button, treeNodeId) => {
      const node =
        cy.getElementById(treeNodeId);

      if (
        node.empty() ||
        node.style("display") === "none"
      ) {
        button.style.display = "none";
      } else {
        const bounds =
          node.renderedBoundingBox({
            includeLabels: false,
            includeOverlays: false,
          });

        button.style.display = "block";
        button.style.left = `${bounds.x2 - 7}px`;
        button.style.top = `${bounds.y1 - 7}px`;
      }
    },
  );
}

export function applyGraphVisibility(
  cy: cytoscape.Core,
  collapsedTreeNodeIds: ReadonlySet<string>,
  filters: SitecoreHarvestFiltersState,
): void {
  const parameterVisibilitySettings =
    readGraphParameterVisibility(cy);

  const filteredTreeNodeIds =
    collectFilteredTreeNodeIds(
      cy,
      filters,
      parameterVisibilitySettings,
    );

  collectEmptyRenderingParameterContainerIds(
    cy,
    filteredTreeNodeIds,
  ).forEach((treeNodeId) => {
    filteredTreeNodeIds.add(treeNodeId);
  });

  const hiddenTreeNodeIds =
    collectCollapsedDescendantIds(
      cy,
      collapsedTreeNodeIds,
    );

  filteredTreeNodeIds.forEach((treeNodeId) => {
    hiddenTreeNodeIds.add(treeNodeId);
  });

  cy.nodes().forEach((node) => {
    node.style(
      "display",
      hiddenTreeNodeIds.has(node.id())
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
      hiddenTreeNodeIds.has(sourceTreeNodeId) ||
        hiddenTreeNodeIds.has(targetTreeNodeId)
        ? "none"
        : "element",
    );
  });
}

function collectFilteredTreeNodeIds(
  cy: cytoscape.Core,
  filters: SitecoreHarvestFiltersState,
  parameterVisibilitySettings:
    GraphParameterVisibilitySettings,
): Set<string> {
  const filteredTreeNodeIds =
    new Set<string>();

  cy.nodes().forEach((node) => {
    if (
      isNodeHiddenByFilter(node, filters) ||
      isNodeHiddenByParameterVisibility(
        node,
        parameterVisibilitySettings,
      )
    ) {
      filteredTreeNodeIds.add(node.id());
    }
  });

  return filteredTreeNodeIds;
}

function collectEmptyRenderingParameterContainerIds(
  cy: cytoscape.Core,
  filteredTreeNodeIds: ReadonlySet<string>,
): Set<string> {
  const emptyContainerTreeNodeIds =
    new Set<string>();

  cy.nodes().forEach((node) => {
    const collapseKey: unknown =
      node.data("collapseKey");

    if (
      collapseKey ===
      GRAPH_COLLAPSE_KEY.RENDERING_PARAMETERS
    ) {
      const childTreeNodeIds = readChildTreeNodeIds(node);

      const hasVisibleChild =
        childTreeNodeIds.some(
          (childTreeNodeId) =>
            !filteredTreeNodeIds.has(
              childTreeNodeId,
            ),
        );

      if (!hasVisibleChild) {
        emptyContainerTreeNodeIds.add(
          node.id(),
        );
      }
    }
  });

  return emptyContainerTreeNodeIds;
}

function readGraphParameterVisibility(
  cy: cytoscape.Core,
): GraphParameterVisibilitySettings {
  const storedValue: unknown =
    cy.scratch(
      PARAMETER_VISIBILITY_SCRATCH_KEY,
    );

  let settings =
    DEFAULT_GRAPH_PARAMETER_VISIBILITY_SETTINGS;

  if (
    storedValue &&
    typeof storedValue === "object"
  ) {
    const candidate =
      storedValue as Partial<GraphParameterVisibilitySettings>;

    if (
      typeof candidate.hideEmptyParameters ===
      "boolean" &&
      typeof candidate.hideNonGuidParameters ===
      "boolean"
    ) {
      settings = {
        hideEmptyParameters:
          candidate.hideEmptyParameters,
        hideNonGuidParameters:
          candidate.hideNonGuidParameters,
      };
    }
  }

  return settings;
}

function isNodeHiddenByParameterVisibility(
  node: cytoscape.NodeSingular,
  settings: GraphParameterVisibilitySettings,
): boolean {
  const parameterIsItemReference: unknown =
    node.data("renderingParameterIsItemReference");

  const parameterValue: unknown =
    node.data("renderingParameterValue");

  const isRenderingParameter =
    typeof parameterIsItemReference === "boolean" ||
    typeof parameterValue === "string";

  let hidden = false;

  if (isRenderingParameter) {
    if (
      settings.hideEmptyParameters &&
      typeof parameterValue === "string" &&
      parameterValue.trim().length === 0
    ) {
      hidden = true;
    }

    if (
      settings.hideNonGuidParameters &&
      parameterIsItemReference === false
    ) {
      hidden = true;
    }
  }

  return hidden;
}

function isNodeHiddenByFilter(
  node: cytoscape.NodeSingular,
  filters: SitecoreHarvestFiltersState,
): boolean {
  let hidden = false;

  CONST.FOBLES.REFERENCE_GRAPH.FILTER_DEFS.forEach(
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
  collapsedTreeNodeIds: ReadonlySet<string>,
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
  descendantTreeNodeIds: Set<string>,
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

export function readChildTreeNodeIds(
  node: cytoscape.NodeSingular,
): string[] {
  const value: unknown =
    node.data("childTreeNodeIds");

  let childTreeNodeIds: string[] = [];

  if (Array.isArray(value)) {
    childTreeNodeIds =
      value.filter(
        (entry): entry is string =>
          typeof entry === "string",
      );
  }

  return childTreeNodeIds;
}

export function removeMissingCollapsedTreeNodeIds(
  cy: cytoscape.Core,
  collapsedTreeNodeIds: Set<string>,
): void {
  collapsedTreeNodeIds.forEach((treeNodeId) => {
    if (
      cy.getElementById(treeNodeId).empty()
    ) {
      collapsedTreeNodeIds.delete(
        treeNodeId,
      );
    }
  });
}