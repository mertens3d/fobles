import type { ScControl } from "../../../../sitecore-harvester/sitecore-harvester.types";
import { createRenderingTree, createScopedId } from "./layout-tree-builder";
import { type CompoundGraphNode } from "../../graph.types";
import { stripDynamicPlaceholderSuffix } from "../../graph-helpers";
import { CONST } from "../../../../../constants/const";
import { buildTooltipContent, buildTooltip } from "../../graph-tooltip";
import type { SatelliteDescriptor } from "../../reference-graph.types";

export function createPlaceholderTrees(
  deviceNodeId: string,
  scControls: ScControl[],
): CompoundGraphNode[] {
  const roots: CompoundGraphNode[] = [];
  const placeholders = new Map<string, CompoundGraphNode>();

  scControls.forEach((control, controlIndex) => {
    processPlaceholderForOneControl(
      control,
      roots,
      placeholders,
      deviceNodeId,
      controlIndex,
    );
  });

  return roots;
}

function processPlaceholderForOneControl(
  control: ScControl,
  roots: CompoundGraphNode[],
  placeholders: Map<string, CompoundGraphNode>,
  deviceNodeId: string,
  controlIndex: number,
) {
  const rawPlaceholderPath = control.placeholder || "(no placeholder)";

  const placeHolderSegments = rawPlaceholderPath
    .split("/")
    .filter(Boolean)
    .map(stripDynamicPlaceholderSuffix);

  const normalizedPlaceholderSegments =
    placeHolderSegments.length > 0 ? placeHolderSegments : [rawPlaceholderPath];

  let targetChildren = roots;
  let currentPath = "";

  normalizedPlaceholderSegments.forEach((segment) => {
    ({ currentPath, targetChildren: targetChildren } = processOnePlaceholderSegment(
      currentPath,
      segment,
      placeholders,
      deviceNodeId,
      targetChildren,
    ));
  });

  targetChildren.push(createRenderingTree(deviceNodeId, control, controlIndex));
}

function processOnePlaceholderSegment(
  currentPath: string,
  segment: string,
  placeholders: Map<string, CompoundGraphNode>,
  deviceNodeId: string,
  targetChildren: CompoundGraphNode[],
) {
  currentPath = currentPath ? `${currentPath}/${segment}` : segment;

  let placeholder = placeholders.get(currentPath);

  if (!placeholder) {
    placeholder = addPlaceholder(
      segment,
      currentPath,
      deviceNodeId,
      placeholders,
      targetChildren,
      placeholder,
    );
  }

  targetChildren = placeholder.children;
  return { currentPath, targetChildren };
}

function addPlaceholder(
  segment: string,
  currentPath: string,
  deviceNodeId: string,
  placeholders: Map<string, CompoundGraphNode>,
  targetChildren: CompoundGraphNode[],
  placeholder: CompoundGraphNode | undefined,
) {
  const descriptor: SatelliteDescriptor = {
    kind: CONST.FOBLES.REFERENCE_GRAPH.NODE_KIND.STRUCTURAL,
    value: segment,
    path: currentPath,
    placeholder: currentPath,
  };

  const newPlaceholder: CompoundGraphNode = {
    nodeTargetId: createScopedId(
      deviceNodeId,
      CONST.FOBLES.REFERENCE_GRAPH.LAYOUT_SCOPE.PLACEHOLDER,
      currentPath,
    ),
    item: undefined,
    label: segment,
    kind: CONST.FOBLES.REFERENCE_GRAPH.NODE_KIND.STRUCTURAL,
    tooltip: buildTooltipContent(buildTooltip(descriptor)),
    children: [],
  };

  placeholders.set(currentPath, newPlaceholder);

  targetChildren.push(newPlaceholder);
  placeholder = newPlaceholder;
  return placeholder;
}
