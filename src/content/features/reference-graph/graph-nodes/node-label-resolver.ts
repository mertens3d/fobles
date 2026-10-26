// @source-path [fobles] src/content/features/reference-graph/graph-nodes/node-label-resolver.ts

import type { ReferenceModelNode } from "../../../foundation/reference-data/model/reference-model.types";
import type { NodePresentation, NodePresentationByKind } from "./node-presentation.types";
type NodeKind = keyof NodePresentationByKind;
import {
  LINE_BREAKER,
  clampMiddle,
  tryBreakLabel,
  type LabelBreakResult,
} from "./text-line-breaker";

function baseName(
  treeNode: ReferenceModelNode,
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
  treeNode: ReferenceModelNode,
  presentation: NodePresentation,
  kind: NodeKind,
): string {
  let label: string;

  switch (presentation.labelMode) {
    case "kindOnly":
      label = `[${kind.toLowerCase()}]`;
      break;

    case "datasourceName":
      label = baseName(treeNode);
      break;

    case "fieldName":
      label =
        treeNode.provenance.type === "section-field"
          ? treeNode.provenance.fieldName
          : baseName(treeNode);
      break;

    case "parameterName":
      label =
        treeNode.provenance.type === "rendering-parameter"
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

function wrapLabelText(text: string): string {
  const labelBreakResult: LabelBreakResult = {
    success: false,
    label: text,
  };

  if (
    text.length <=
    LINE_BREAKER.MAX_LABEL_LINE_LENGTH
  ) {
    labelBreakResult.success = true;
    labelBreakResult.label += "\n";
  }

  if (!labelBreakResult.success) {
    tryBreakLabel(
      labelBreakResult,
      LINE_BREAKER.LINE_BREAK_REGEX.SPACE,
    );
  }

  if (!labelBreakResult.success) {
    tryBreakLabel(
      labelBreakResult,
      LINE_BREAKER.LINE_BREAK_REGEX.DASH,
    );
  }

  if (!labelBreakResult.success) {
    tryBreakLabel(
      labelBreakResult,
      LINE_BREAKER.LINE_BREAK_REGEX.CAMEL_CASE,
    );
  }

  if (!labelBreakResult.success) {
    clampMiddle(labelBreakResult);
  }

  return labelBreakResult.label;
}

export function resolveNodeLabel(
  treeNode: ReferenceModelNode,
  presentation: NodePresentation,
  kind: NodeKind,
): string {
  const primaryLabel = resolvePrimaryLabel(
    treeNode,
    presentation,
    kind,
  );

  let label = wrapLabelText(primaryLabel);

  if (
    presentation.labelMode === "fieldName" &&
    treeNode.provenance.type === "section-field" &&
    treeNode.provenance.fieldValue
  ) {
    label = `${label}:\n${wrapLabelText(treeNode.provenance.fieldValue)}`;
  }

  if (presentation.secondaryLabel) {
    label =
      `${label}\n` +
      presentation.secondaryLabel;
  }

  return label;
}