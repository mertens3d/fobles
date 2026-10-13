// @source-path [Fobles] src/content/toolbar/reference-graph/components/node-builders/placeholder-graph-nodes.ts

import { createRenderingTree, createScopedId } from "../data-builders/layout-tree-builder";
import { type CompoundGraphNode } from "../../graph.types";
import { CONST } from "../../../../../constants/const";
import { buildTooltipContent, buildTooltip } from "../../graph-tooltip";
import type { SatelliteDescriptor } from "../../reference-graph.types";
import type { PlaceholderTreeNode } from "./placeholder-tree-nodes";

export function createPlaceholderGraphNodes(
  deviceNodeId: string,
  placeholderTreeNodes: PlaceholderTreeNode[],
): CompoundGraphNode[] {
  return placeholderTreeNodes.map((placeholder) =>
    createPlaceholderGraphNode(deviceNodeId, placeholder),
  );
}

function createPlaceholderGraphNode(
  deviceNodeId: string,
  placeholder: PlaceholderTreeNode,
): CompoundGraphNode {
  const segments = placeholder.path.split("/");
  const segment = segments[segments.length - 1] ?? placeholder.path;

  const descriptor: SatelliteDescriptor = {
    kind: CONST.FOBLES.REFERENCE_GRAPH.NODE_KIND.STRUCTURAL,
    value: segment,
    path: placeholder.path,
    placeholder: placeholder.path,
  };

  const children: CompoundGraphNode[] = [];

  // Convert child placeholders recursively
  placeholder.placeholders.forEach((childPlaceholder) => {
    children.push(createPlaceholderGraphNode(deviceNodeId, childPlaceholder));
  });

  // Convert controls/renderings
  placeholder.controls.forEach((control, controlIndex) => {
    children.push(createRenderingTree(deviceNodeId, control, controlIndex));
  });

  return {
    nodeTargetId: createScopedId(
      deviceNodeId,
      CONST.FOBLES.REFERENCE_GRAPH.LAYOUT_SCOPE.PLACEHOLDER,
      placeholder.path,
    ),
    item: undefined,
    label: segment,
    relationshipToParent: "edge", // <-- HERE
    kind: CONST.FOBLES.REFERENCE_GRAPH.NODE_KIND.STRUCTURAL,
    tooltip: buildTooltipContent(buildTooltip(descriptor)),
    children,
  };
}
