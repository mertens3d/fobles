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

    case "datasourceName":
      label =
        `${baseName(treeNode)}`;
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

function clampMiddle(value: string, edgeLength = 12): string {
  return value.length > edgeLength * 2 + 3
    ? `${value.slice(0, edgeLength)}...${value.slice(-edgeLength)}`
    : value;
}

export function resolveNodeLabel(
  treeNode: DataTreeNode,
  presentation: NodePresentation,
): string {
  const primaryLabel = clampMiddle(
    resolvePrimaryLabel(
      treeNode,
      presentation,
    ),
  );

  let label = primaryLabel;

  if (presentation.secondaryLabel) {
    label =
      `${primaryLabel}\n` +
      presentation.secondaryLabel;
  }

  if (isAwaitingEnrichment(treeNode)) {
    label = `*${label}`;
  }

  return label;
}

// Minimal "awaiting enrichment" indicator - removed as soon as an attempt finishes, regardless
// of outcome. No special not-found/failed styling yet.
function isAwaitingEnrichment(
  treeNode: DataTreeNode,
): boolean {
  return (
    treeNode.nodeType === "item" &&
    (treeNode.enrichmentStatus === "pending" ||
      treeNode.enrichmentStatus === "enriching")
  );
}