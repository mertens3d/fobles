import type { ScControl } from "../../../../sitecore-harvester/sitecore-harvester.types";
import { stripDynamicPlaceholderSuffix } from "../../graph-helpers";

export type PlaceholderTreeNode = {
  path: string;
  placeholders: PlaceholderTreeNode[];
  controls: ScControl[];
};

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
    ({ currentPath, targetChildren } = processOnePlaceholderSegment(
      currentPath,
      segment,
      knownPlaceholders,
      targetChildren,
    ));
  });

  const foundPlaceholderTreeNode = knownPlaceholders.get(currentPath);
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
  currentPath = currentPath ? `${currentPath}/${segment}` : segment;

  let placeholder = knownPlaceholders.get(currentPath);

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

  knownPlaceholders.set(currentPath, newPlaceholderTreeNode);

  targetChildren.push(newPlaceholderTreeNode);
  return newPlaceholderTreeNode;
}
