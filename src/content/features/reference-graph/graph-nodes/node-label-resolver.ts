// @source-path [fobles] src/content/features/reference-graph/graph-nodes/node-label-resolver.ts

import type {
  DataTreeNode,
} from "../data-tree/data-tree.types";
import type {
  NodePresentation,
} from "./node-presentation.types";

function baseName(
  treeNode: DataTreeNode,
): string {
  let name: string;

  if (treeNode.nodeType === "item") {
    name =
      treeNode.scItem.scItemName ??
      treeNode.scItem.scItemId ??
      "Unknown item";
  } else {
    name = treeNode.name;
  }

  return name;
}

function resolvePrimaryLabel(
  treeNode: DataTreeNode,
  presentation: NodePresentation,
): string {
  let label: string;

  switch (presentation.labelMode) {
    case "kindOnly":
      label =
        `[${treeNode.kind.toLowerCase()}]`;
      break;

    case "nameAndKind":
      label =
        `${baseName(treeNode)}\n` +
        `[${treeNode.kind.toLowerCase()}]`;
      break;

    case "datasourceName":
      label =
        `ds: ${baseName(treeNode)}`;
      break;

    case "fieldName":
      label =
        treeNode.provenance.type ===
        "section-field"
          ? treeNode.provenance.fieldName
          : baseName(treeNode);
      break;

    case "parameterName":
      label =
        treeNode.provenance.type ===
        "rendering-parameter"
          ? treeNode.provenance.parameterName
          : baseName(treeNode);
      break;

    case "name":
    default:
      label = baseName(treeNode);
      break;
  }

  return label;
}

export function resolveNodeLabel(
  treeNode: DataTreeNode,
  presentation: NodePresentation,
): string {
  const primaryLabel =
    resolvePrimaryLabel(
      treeNode,
      presentation,
    );

  let label = primaryLabel;

  if (presentation.secondaryLabel) {
    label =
      `${primaryLabel}\n` +
      presentation.secondaryLabel;
  }

  return label;
}