// @source-path [fobles] src/content/features/auditor/auditor-grid/auditor-group-rows.ts

import { CONST } from "../../../../constants/const";
import { createReferenceModelNodeId } from "../../../foundation/reference-data/model/layout-reference-model-builder";
import { AUDITOR_GROUP_STATUS, AUDITOR_WRAPPED_GROUP_DEFINITIONS } from "./auditor-group-status.const";
import type {
  AuditorGroupDefinition,
  AuditorGroupStatus,
  AuditorPlaceholderKind,
  AuditorTreeRow,
} from "./auditor-grid.types";

// Agent: Synthetic group rows reuse the exact tree node id the Reference Model gives the real group, so when the
// Agent: data arrives the real row replaces the synthetic one in place and keeps its expanded/collapsed state.
// Agent: Parent/Template have no group node in the model, so their (Auditor-only) group id adds a "group" suffix; the
// Agent: real parent/template item keeps its own model id underneath it.
export function expectedGroupTreeNodeId(definition: AuditorGroupDefinition, rootItemId: string): string {
  const isWrapped = AUDITOR_WRAPPED_GROUP_DEFINITIONS.some((wrapped) => wrapped.branch === definition.branch);
  const wrappedSuffix = isWrapped ? AUDITOR_GROUP_STATUS.WRAPPED_GROUP_ID_SUFFIX : undefined;
  return definition.branch === "layouts"
    ? CONST.FOBLES.REFERENCE_GRAPH.NODE_ID.MAIN_LAYOUT_BOX_NODE_ID
    : createReferenceModelNodeId(rootItemId, definition.branch, wrappedSuffix);
}

function emptyRow(id: string, parentId: string, depth: number, label: string): AuditorTreeRow {
  return {
    id,
    parentId,
    depth,
    kind: "synthetic-group",
    label,
    details: undefined,
    path: undefined,
    origin: undefined,
    status: "passed",
    hasChildren: false,
    referenceModelNodeId: undefined,
    icon: undefined,
    finding: undefined,
    journeyStage: "referenced",
    isSitecoreItem: false,
    findings: [],
    descendantFailures: [],
    searchText: "",
  };
}

export function createSyntheticGroupRow(
  definition: AuditorGroupDefinition,
  root: AuditorTreeRow,
  rootItemId: string,
  groupStatus: AuditorGroupStatus,
): AuditorTreeRow {
  return {
    ...emptyRow(expectedGroupTreeNodeId(definition, rootItemId), root.id, root.depth + 1, definition.label),
    status: groupStatus.state === "auditing" ? "pending" : "passed",
    searchText: definition.label.toLowerCase(),
    branch: definition.branch,
    collapseKey: definition.collapseKey,
    groupStatus,
  };
}

export function createPlaceholderRow(
  parent: AuditorTreeRow,
  kind: AuditorPlaceholderKind,
  noun: string,
): AuditorTreeRow {
  return {
    ...emptyRow(
      `${parent.id}-${AUDITOR_GROUP_STATUS.PLACEHOLDER_ID_SUFFIX}`,
      parent.id,
      parent.depth + 1,
      `${AUDITOR_GROUP_STATUS.PLACEHOLDER_PREFIX_BY_KIND[kind]} ${noun}`,
    ),
    kind: "placeholder",
    status: kind === "auditing" ? "pending" : "passed",
    branch: parent.branch,
    placeholder: kind,
  };
}
