// @source-path [fobles] src/content/features/reference-graph/graph-nodes/graph-expand-collapse-view.ts

import type cytoscape from "cytoscape";
import { CONST } from "../../../../constants/const";
import type { SitecoreHarvestFiltersState } from "../../../sitecore-harvester/sitecore-harvester.types";
import {
  DEFAULT_GRAPH_PARAMETER_VISIBILITY_SETTINGS,
  type GraphParameterVisibilitySettings,
} from "../graph-parameter-visibility-settings";
import { GRAPH_COLLAPSE_KEY } from "./graph-collapse.types";
import type { ExpandCollapseButtonController, ExpandCollapseAction } from "./graph-node.types";

const PARAMETER_VISIBILITY_SCRATCH_KEY = "_foblesParameterVisibilitySettings";

const EXPAND_COLLAPSE_TOOLTIP = [
  "Click: expand/collapse this node",
  "Ctrl/Cmd+Click: expand/collapse all nodes of this kind",
  "Shift+Click: expand/collapse this subtree",
].join("\n");

export function setGraphParameterVisibility(cy: cytoscape.Core, settings: GraphParameterVisibilitySettings): void {
  cy.scratch(PARAMETER_VISIBILITY_SCRATCH_KEY, settings);
}

export function createExpandCollapseOverlay(container: HTMLElement): HTMLDivElement {
  if (getComputedStyle(container).position === "static") {
    container.style.position = "relative";
  }

  const overlay = document.createElement("div");
  overlay.className = "fobles-reference-graph-expand-collapse-controls";

  overlay.style.cssText = ["position:absolute", "inset:0", "pointer-events:none", "z-index:10", "overflow:hidden"].join(
    ";",
  );

  container.appendChild(overlay);

  return overlay;
}

export function synchronizeExpandCollapseControls(
  cy: cytoscape.Core,
  controller: ExpandCollapseButtonController,
  onToggle: (treeNodeId: string, action: ExpandCollapseAction) => void,
): void {
  const expandableTreeNodeIds = new Set<string>();
  const enrichingTreeNodeIds = new Set<string>();

  cy.nodes().forEach((node) => {
    const treeNodeId = node.id();

    if (node.data("expandable") === true) {
      expandableTreeNodeIds.add(treeNodeId);

      let button = controller.buttonsByTreeNodeId.get(treeNodeId);

      if (!button) {
        button = createExpandCollapseButton(treeNodeId, onToggle);

        controller.buttonsByTreeNodeId.set(treeNodeId, button);

        controller.overlay.appendChild(button);
      }

      const collapsed = controller.collapsedTreeNodeIds.has(treeNodeId);

      button.textContent = collapsed ? "+" : "−";
      button.title = EXPAND_COLLAPSE_TOOLTIP;
      button.setAttribute("aria-label", `${collapsed ? "Expand" : "Collapse"} node. ${EXPAND_COLLAPSE_TOOLTIP}`);
      button.dataset.collapsed = String(collapsed);
    }

    if (isNodeAwaitingEnrichment(node)) {
      enrichingTreeNodeIds.add(treeNodeId);

      let spinner = controller.spinnersByTreeNodeId.get(treeNodeId);

      if (!spinner) {
        spinner = createEnrichmentSpinner();

        controller.spinnersByTreeNodeId.set(treeNodeId, spinner);

        controller.overlay.appendChild(spinner);
      }
    }
  });

  for (const [treeNodeId, button] of controller.buttonsByTreeNodeId) {
    if (!expandableTreeNodeIds.has(treeNodeId)) {
      button.remove();
      controller.buttonsByTreeNodeId.delete(treeNodeId);
      controller.collapsedTreeNodeIds.delete(treeNodeId);
    }
  }

  for (const [treeNodeId, spinner] of controller.spinnersByTreeNodeId) {
    if (!enrichingTreeNodeIds.has(treeNodeId)) {
      spinner.remove();
      controller.spinnersByTreeNodeId.delete(treeNodeId);
    }
  }
}

function createExpandCollapseButton(
  treeNodeId: string,
  onToggle: (treeNodeId: string, action: ExpandCollapseAction) => void,
): HTMLButtonElement {
  const button = document.createElement("button");

  button.type = "button";
  button.className = "fobles-reference-graph-expand-collapse-button";

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

  const stopPointerEvent = (event: Event): void => {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
  };

  button.addEventListener("pointerdown", stopPointerEvent);

  button.addEventListener("mousedown", stopPointerEvent);

  button.addEventListener("click", (event) => {
    let action: ExpandCollapseAction = "single";

    if (event.shiftKey) {
      action = "subtree";
    } else if (event.ctrlKey || event.metaKey) {
      action = "same-kind";
    }

    stopPointerEvent(event);
    onToggle(treeNodeId, action);
  });

  return button;
}

function createEnrichmentSpinner(): HTMLImageElement {
  const spinner = document.createElement("img");

  spinner.src = CONST.SITECORE.ICONS.SPINNER_SRC;
  spinner.alt = "";
  spinner.className = "fobles-reference-graph-enrichment-spinner";
  spinner.setAttribute("aria-hidden", "true");

  return spinner;
}

function isNodeAwaitingEnrichment(node: cytoscape.NodeSingular): boolean {
  const status: unknown = node.data("enrichmentStatus");

  return status === "pending" || status === "enriching";
}

export function positionExpandCollapseControls(cy: cytoscape.Core, controller: ExpandCollapseButtonController): void {
  controller.buttonsByTreeNodeId.forEach((button, treeNodeId) => {
    const node = cy.getElementById(treeNodeId);

    if (node.empty() || node.style("display") === "none") {
      button.style.display = "none";
    } else {
      const bounds = node.renderedBoundingBox({ includeLabels: false, includeOverlays: false });

      button.style.display = "block";
      button.style.left = `${bounds.x2 - 7}px`;
      button.style.top = `${bounds.y1 - 7}px`;
    }
  });

  controller.spinnersByTreeNodeId.forEach((spinner, treeNodeId) => {
    const node = cy.getElementById(treeNodeId);

    if (node.empty() || node.style("display") === "none") {
      spinner.style.display = "none";
    } else {
      const bounds = node.renderedBoundingBox({ includeLabels: false, includeOverlays: false });

      spinner.style.display = "block";
      spinner.style.left = `${bounds.x1 - 8}px`;
      spinner.style.top = `${bounds.y1 - 8}px`;
    }
  });
}

export function applyGraphVisibility(
  cy: cytoscape.Core,
  collapsedTreeNodeIds: ReadonlySet<string>,
  filters: SitecoreHarvestFiltersState,
): void {
  const parameterVisibilitySettings = readGraphParameterVisibility(cy);
  const filteredTreeNodeIds = collectFilteredTreeNodeIds(cy, filters, parameterVisibilitySettings);

  collectEmptyRenderingParameterContainerIds(cy, filteredTreeNodeIds).forEach((treeNodeId: string) => {
    filteredTreeNodeIds.add(treeNodeId);
  });

  const hiddenTreeNodeIds = collectCollapsedDescendantIds(cy, collapsedTreeNodeIds);

  filteredTreeNodeIds.forEach((treeNodeId: string) => {
    hiddenTreeNodeIds.add(treeNodeId);
  });

  cy.nodes().forEach((node) => {
    node.style("display", hiddenTreeNodeIds.has(node.id()) ? "none" : "element");
  });

  cy.edges().forEach((edge) => {
    const sourceTreeNodeId = edge.data("source") as string;
    const targetTreeNodeId = edge.data("target") as string;

    edge.style(
      "display",
      hiddenTreeNodeIds.has(sourceTreeNodeId) || hiddenTreeNodeIds.has(targetTreeNodeId)
        ? "none"
        : "element",
    );
  });
}

function collectFilteredTreeNodeIds(
  cy: cytoscape.Core,
  filters: SitecoreHarvestFiltersState,
  parameterVisibilitySettings: GraphParameterVisibilitySettings,
): Set<string> {
  const filteredTreeNodeIds = new Set<string>();

  cy.nodes().forEach((node) => {
    if (isNodeHiddenByFilter(node, filters) || isNodeHiddenByParameterVisibility(node, parameterVisibilitySettings)) {
      filteredTreeNodeIds.add(node.id());
    }
  });

  return filteredTreeNodeIds;
}

function collectEmptyRenderingParameterContainerIds(
  cy: cytoscape.Core,
  filteredTreeNodeIds: ReadonlySet<string>,
): Set<string> {
  const emptyContainerTreeNodeIds = new Set<string>();

  cy.nodes().forEach((node) => {
    if (node.data("collapseKey") === GRAPH_COLLAPSE_KEY.RENDERING_PARAMETERS) {
      const childTreeNodeIds = readChildTreeNodeIds(node);
      const hasVisibleChild = childTreeNodeIds.some(
        (childTreeNodeId: string) => !filteredTreeNodeIds.has(childTreeNodeId),
      );

      if (!hasVisibleChild) {
        emptyContainerTreeNodeIds.add(node.id());
      }
    }
  });

  return emptyContainerTreeNodeIds;
}

function readGraphParameterVisibility(cy: cytoscape.Core): GraphParameterVisibilitySettings {
  const storedValue: unknown = cy.scratch(PARAMETER_VISIBILITY_SCRATCH_KEY);

  let settings = DEFAULT_GRAPH_PARAMETER_VISIBILITY_SETTINGS;

  if (storedValue && typeof storedValue === "object") {
    const candidate = storedValue as Partial<GraphParameterVisibilitySettings>;

    if (typeof candidate.hideEmptyParameters === "boolean" && typeof candidate.hideNonGuidParameters === "boolean") {
      settings = {
        hideEmptyParameters: candidate.hideEmptyParameters,
        hideNonGuidParameters: candidate.hideNonGuidParameters,
      };
    }
  }

  return settings;
}

function isNodeHiddenByParameterVisibility(
  node: cytoscape.NodeSingular,
  settings: GraphParameterVisibilitySettings,
): boolean {
  const parameterIsItemReference: unknown = node.data("renderingParameterIsItemReference");
  const parameterValue: unknown = node.data("renderingParameterValue");
  const isRenderingParameter = typeof parameterIsItemReference === "boolean" || typeof parameterValue === "string";

  let hidden = false;

  if (isRenderingParameter) {
    if (settings.hideEmptyParameters && typeof parameterValue === "string" && parameterValue.trim().length === 0) {
      hidden = true;
    }

    if (settings.hideNonGuidParameters && parameterIsItemReference === false) {
      hidden = true;
    }
  }

  return hidden;
}

function isNodeHiddenByFilter(node: cytoscape.NodeSingular, filters: SitecoreHarvestFiltersState): boolean {
  let hidden = false;

  CONST.FOBLES.REFERENCE_GRAPH.FILTER_DEFS.forEach(({ key, className }) => {
    if (!filters[key] && node.hasClass(className)) {
      hidden = true;
    }
  });

  return hidden;
}

function collectCollapsedDescendantIds(cy: cytoscape.Core, collapsedTreeNodeIds: ReadonlySet<string>): Set<string> {
  const descendantTreeNodeIds = new Set<string>();

  collapsedTreeNodeIds.forEach((collapsedTreeNodeId: string) => {
    collectDescendantTreeNodeIds(cy, collapsedTreeNodeId, descendantTreeNodeIds);
  });

  return descendantTreeNodeIds;
}

function collectDescendantTreeNodeIds(
  cy: cytoscape.Core,
  treeNodeId: string,
  descendantTreeNodeIds: Set<string>,
): void {
  const treeNode = cy.getElementById(treeNodeId);

  if (!treeNode.empty()) {
    readChildTreeNodeIds(treeNode).forEach((childTreeNodeId: string) => {
      if (!descendantTreeNodeIds.has(childTreeNodeId)) {
        descendantTreeNodeIds.add(childTreeNodeId);

        collectDescendantTreeNodeIds(cy, childTreeNodeId, descendantTreeNodeIds);
      }
    });
  }
}

export function readChildTreeNodeIds(node: cytoscape.NodeSingular): string[] {
  const value: unknown = node.data("childTreeNodeIds");
  let childTreeNodeIds: string[] = [];

  if (Array.isArray(value)) {
    childTreeNodeIds = value.filter((entry): entry is string => typeof entry === "string");
  }

  return childTreeNodeIds;
}

export function removeMissingCollapsedTreeNodeIds(cy: cytoscape.Core, collapsedTreeNodeIds: Set<string>): void {
  collapsedTreeNodeIds.forEach((treeNodeId: string) => {
    if (cy.getElementById(treeNodeId).empty()) {
      collapsedTreeNodeIds.delete(treeNodeId);
    }
  });
}
