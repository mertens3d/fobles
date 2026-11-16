// @source-path [fobles] src/content/features/auditor/checks/reference-resolved-details.ts

import { AUDIT_CHECK } from "../../../../constants/audit-checks.const.ts";
import type { ItemGraphNodeData, ReferenceModelItemNode } from "../../../foundation/reference-data/model/model.types";
import type { ReferenceModelNode, ReferenceModelProvenance, ScControl } from "../../../foundation/reference-data/model/model.types";
import type { ReferenceProvenanceOf } from "./reference-resolved-check.types";

const DETAILS = AUDIT_CHECK.REFERENCE_RESOLVED.DETAILS;

// Agent: Reference Model values come from Sitecore markup and cached copies; any of them may be missing, empty or not
// Agent: a string, so every value read here goes through text().
function text(value: unknown): string | undefined {
  const trimmed = typeof value === "string" ? value.trim() : "";
  const limited = trimmed.length > DETAILS.MAX_VALUE_LENGTH
    ? `${trimmed.slice(0, DETAILS.MAX_VALUE_LENGTH)}${DETAILS.ELLIPSIS}`
    : trimmed;
  return limited || undefined;
}

function quoted(value: unknown, fallback: string = DETAILS.EMPTY_VALUE): string {
  return `"${text(value) ?? fallback}"`;
}

function itemLabel(item: Partial<ItemGraphNodeData> | undefined): string {
  return text(item?.scItemName) ?? text(item?.scItemPath) ?? text(item?.scItemId) ?? DETAILS.UNNAMED_ITEM;
}

export function referenceNodeLabel(node: ReferenceModelNode): string {
  return node.nodeType === "item" ? itemLabel(node.scItem) : text(node.name) ?? DETAILS.UNNAMED_GROUP;
}

function sameItem(left: Partial<ItemGraphNodeData> | undefined, right: Partial<ItemGraphNodeData> | undefined): boolean {
  const leftId = text(left?.scItemId)?.toLowerCase();
  return leftId !== undefined && leftId === text(right?.scItemId)?.toLowerCase();
}

function describeControl(provenance: ReferenceProvenanceOf<"rendering-control">, target: ItemGraphNodeData): string {
  const control: Partial<ScControl> | undefined = provenance.control;
  const rendering = quoted(control?.rendering?.scItemName, DETAILS.UNNAMED_ITEM);
  return sameItem(control?.datasource, target)
    ? `${DETAILS.DATASOURCE_OF_RENDERING} ${rendering}`
    : `${DETAILS.RENDERING} ${rendering}`;
}

// Agent: How the referencing item points at this item, when the Reference Model recorded it.
function describeProvenance(node: ReferenceModelItemNode): string | undefined {
  const provenance: ReferenceModelProvenance | undefined = node.provenance;
  switch (provenance?.type) {
    case "field-reference":
      return `${DETAILS.FIELD} ${quoted(provenance.fieldName)} ${DETAILS.IN_SECTION} ${quoted(provenance.sectionName)} ${DETAILS.HOLDS} ${quoted(provenance.sourceValue)}`;
    case "section-field":
      return `${DETAILS.FIELD} ${quoted(provenance.fieldName)} ${DETAILS.HOLDS} ${quoted(provenance.fieldValue)}`;
    case "rendering-control":
      return describeControl(provenance, node.scItem);
    case "rendering-parameter":
      return `${DETAILS.RENDERING_PARAMETER} ${quoted(provenance.parameterName)} ${DETAILS.HOLDS} ${quoted(provenance.decodedValue || provenance.parameterValue)}`;
    case "layout-device":
      return `${DETAILS.LAYOUT_DEVICE} ${quoted(provenance.device?.scDeviceItem?.scItemName, DETAILS.UNNAMED_ITEM)}`;
    default:
      return undefined;
  }
}

function lastItemIndex(ancestors: readonly ReferenceModelNode[]): number {
  return ancestors.reduce((found, node, index) => (node.nodeType === "item" ? index : found), -1);
}

// Agent: The nearest item above this row is the item that holds the reference; the group rows between them
// Agent: (Template, Children, Layouts, a field section, ...) are the route the reference was found through.
function describeReferrer(ancestors: readonly ReferenceModelNode[]): string {
  const ownerIndex = lastItemIndex(ancestors);
  const owner = ancestors[ownerIndex];
  const groups = ancestors.slice(ownerIndex + 1).map(referenceNodeLabel);
  const route = groups.length ? `${DETAILS.THROUGH} ${groups.join(DETAILS.CHAIN_SEPARATOR)}` : DETAILS.DIRECTLY;
  return `${DETAILS.REFERENCED_BY_LABEL}: ${owner ? quoted(referenceNodeLabel(owner)) : DETAILS.UNNAMED_ITEM} ${route}`;
}

// Agent: One line per fact, joined with LINE_SEPARATOR: who references this item, how (when known) and the full path
// Agent: from the audited item, so a failure shown under an ancestor row can be traced back to where it was found.
export function describeReferenceResolvedDetails(
  node: ReferenceModelItemNode,
  ancestors: readonly ReferenceModelNode[],
): string {
  const chain = [...ancestors, node].map(referenceNodeLabel).join(DETAILS.CHAIN_SEPARATOR);
  const reference = describeProvenance(node);
  const lines = ancestors.length
    ? [
        describeReferrer(ancestors),
        reference ? `${DETAILS.REFERENCE_LABEL}: ${reference}` : undefined,
        `${DETAILS.CHAIN_LABEL}: ${chain}`,
      ]
    : [DETAILS.AUDITED_ITEM];
  return lines.filter((line): line is string => line !== undefined).join(DETAILS.LINE_SEPARATOR);
}
