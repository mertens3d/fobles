// @source-path [fobles] src/content/features/reference-graph/graph-nodes/graph-visibility-layout.ts

import type cytoscape from "cytoscape";
import { runGraphLayout } from "../cytoscape/graph-layout";
import { GRAPH_COLLAPSE_KEY } from "../../../foundation/reference-data/model/graph-collapse.types";

export type GraphVisibilityLayoutContext = {
  getCurrentLayoutPresetName: () => Parameters<typeof runGraphLayout>[1];
  getRootTreeNodeId: () => string;
  refreshVisibility: () => void;
};

export function runInitialVisibilityLayout(
  cy: cytoscape.Core,
  context: GraphVisibilityLayoutContext,
  onComplete?: () => void,
): void {
  context.refreshVisibility();

  runGraphLayout(
    cy,
    context.getCurrentLayoutPresetName(),
    resolveLayoutRootTreeNodeId(cy, context.getRootTreeNodeId()),
    () => {
      context.refreshVisibility();
      onComplete?.();
    },
  );
}

export function runVisibilityLayout(
  cy: cytoscape.Core,
  context: GraphVisibilityLayoutContext,
  onComplete?: () => void,
): void {
  const zoom = cy.zoom();
  const pan = { ...cy.pan() };

  context.refreshVisibility();

  runGraphLayout(
    cy,
    context.getCurrentLayoutPresetName(),
    resolveLayoutRootTreeNodeId(cy, context.getRootTreeNodeId()),
    () => {
      cy.zoom(zoom);
      cy.pan(pan);
      context.refreshVisibility();
      onComplete?.();
    },
  );
}

function resolveLayoutRootTreeNodeId(
  cy: cytoscape.Core,
  semanticRootTreeNodeId: string,
): string {
  let layoutRootTreeNodeId = semanticRootTreeNodeId;

  cy.nodes().forEach((node) => {
    if (
      node.visible() &&
      node.data("collapseKey") === GRAPH_COLLAPSE_KEY.PARENT
    ) {
      layoutRootTreeNodeId = node.id();
    }
  });

  return layoutRootTreeNodeId;
}