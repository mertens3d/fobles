// @source-path [fobles] src/content/features/reference-graph/cytoscape/graph-layout.ts

import type cytoscape from "cytoscape";
import { CONST } from "../../../../constants/const";
import { extensionLog } from "../../../logger";
import type { LayoutGraphPresetName } from "../graph.types";

export function runGraphLayout(
  cy: cytoscape.Core,
  presetName: LayoutGraphPresetName,
  rootTreeNodeId: string,
  onComplete?: () => void,
): void {
  const preset =
    CONST.FOBLES.REFERENCE_GRAPH.LAYOUT_PRESETS[presetName];
  const edges = cy.edges();

  if (preset.edgeStyle === "taxi") {
    edges.style({
      "curve-style": "taxi",
      "taxi-direction": "downward",
    });
  } else {
    edges.style({
      "curve-style": "bezier",
      "taxi-direction": "auto",
    });
  }

  const visibleElements = cy
    .elements()
    .filter((element) => element.visible());

  extensionLog.debug("Reference graph layout: starting", {
    presetName,
    rootTreeNodeId,
    visibleNodeCount: visibleElements.nodes().length,
    visibleEdgeCount: visibleElements.edges().length,
  });

  const layout = visibleElements.layout(
    preset.build(rootTreeNodeId),
  );

  let completed = false;

  const complete = (): void => {
    if (!completed) {
      completed = true;

      extensionLog.debug("Reference graph layout: complete", {
        presetName,
        rootTreeNodeId,
        visibleNodeCount: visibleElements.nodes().length,
        visibleEdgeCount: visibleElements.edges().length,
      });

      onComplete?.();
    }
  };

  layout.one("layoutstop", complete);

  try {
    layout.run();

    if (!completed) {
      requestAnimationFrame(() => {
        if (!completed) {
          extensionLog.warn(
            "Reference graph layout: layoutstop not observed; completing after layout run",
            {
              presetName,
              rootTreeNodeId,
            },
          );

          complete();
        }
      });
    }
  } catch (error) {
    extensionLog.error(
      "Reference graph layout: failed",
      {
        presetName,
        rootTreeNodeId,
        error,
      },
    );

    complete();
  }
}