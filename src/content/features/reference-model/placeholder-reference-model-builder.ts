// @source-path [fobles] src/content/features/reference-graph/reference-model/placeholder-reference-model-builder.ts

import type { ScControl } from "./sitecore-item.types";
import type { PlaceholderTreeNode } from "./reference-model.types";

export function createPlaceholderTreeNodes(
  scControls: ScControl[],
): PlaceholderTreeNode[] {
  const rootPlaceholders: PlaceholderTreeNode[] = [];
  const knownPlaceholders = new Map<string, PlaceholderTreeNode>();

  scControls.forEach((control) => {
    processPlaceholderForOneControl(
      control,
      rootPlaceholders,
      knownPlaceholders,
    );
  });

  return rootPlaceholders;
}

function processPlaceholderForOneControl(
  control: ScControl,
  roots: PlaceholderTreeNode[],
  knownPlaceholders: Map<string, PlaceholderTreeNode>,
): void {
  const rawPlaceholderPath =
    control.placeholder || "(no placeholder)";

  const placeholderSegments = rawPlaceholderPath
    .split("/")
    .filter(Boolean)
    .map(stripDynamicPlaceholderSuffix);

  const normalizedPlaceholderSegments =
    placeholderSegments.length > 0
      ? placeholderSegments
      : [rawPlaceholderPath];

  let targetChildren = roots;
  let currentPath = "";

  normalizedPlaceholderSegments.forEach((segment) => {
    ({ currentPath, targetChildren } =
      processOnePlaceholderSegment(
        currentPath,
        segment,
        knownPlaceholders,
        targetChildren,
      ));
  });

  const foundPlaceholderTreeNode =
    knownPlaceholders.get(currentPath);

  if (foundPlaceholderTreeNode) {
    foundPlaceholderTreeNode.controls.push(control);
  } else {
    throw new Error(
      `Placeholder tree node not found for path: ${rawPlaceholderPath}`,
    );
  }
}

function processOnePlaceholderSegment(
  currentPath: string,
  segment: string,
  knownPlaceholders: Map<string, PlaceholderTreeNode>,
  targetChildren: PlaceholderTreeNode[],
): {
  currentPath: string;
  targetChildren: PlaceholderTreeNode[];
} {
  currentPath = currentPath
    ? `${currentPath}/${segment}`
    : segment;

  let placeholder =
    knownPlaceholders.get(currentPath);

  if (!placeholder) {
    placeholder = addPlaceholderTreeNode(
      currentPath,
      knownPlaceholders,
      targetChildren,
    );
  }

  return {
    currentPath,
    targetChildren: placeholder.placeholders,
  };
}

function addPlaceholderTreeNode(
  currentPath: string,
  knownPlaceholders: Map<string, PlaceholderTreeNode>,
  targetChildren: PlaceholderTreeNode[],
): PlaceholderTreeNode {
  const newPlaceholderTreeNode: PlaceholderTreeNode = {
    path: currentPath,
    placeholders: [],
    controls: [],
  };

  knownPlaceholders.set(
    currentPath,
    newPlaceholderTreeNode,
  );

  targetChildren.push(newPlaceholderTreeNode);

  return newPlaceholderTreeNode;
}

function stripDynamicPlaceholderSuffix(
  segment: string,
): string {
  return segment.replace(
    /-\{[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\}-\d+$/i,
    "",
  );
}