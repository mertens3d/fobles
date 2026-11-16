// @source-path [fobles] src/content/features/auditor/auditor-grid/auditor-group-status.ts

import { GRAPH_COLLAPSE_KEY } from "../../../foundation/reference-data/model/model.const";
import type { ReferenceModelNode } from "../../../foundation/reference-data/model/model.types";
import { resolveBranchLoadState } from "./auditor-group-load-state";
import { createPlaceholderRow, createSyntheticGroupRow } from "./auditor-group-rows";
import {
  AUDITOR_BRANCH_ORDER,
  AUDITOR_GROUP_COPY,
  AUDITOR_GROUP_COUNT_RULES,
  AUDITOR_GROUP_DEFINITIONS,
  AUDITOR_GROUP_STATUS,
  AUDITOR_WRAPPED_GROUP_DEFINITIONS,
} from "./auditor-group-status.const";
import type {
  AuditorGroupCount,
  AuditorGroupCountRule,
  AuditorGroupDefinition,
  AuditorGroupLoadState,
  AuditorGroupStatus,
  AuditorGroupStatusContext,
  AuditorPlaceholderKind,
  AuditorRowsByParentId,
  AuditorTreeRow,
} from "./auditor-grid.types";

function indexAuditorRowsByParentId(rows: readonly AuditorTreeRow[]): AuditorRowsByParentId {
  const rowsByParentId = new Map<string, AuditorTreeRow[]>();
  rows.forEach((row) => {
    if (row.parentId) {
      rowsByParentId.set(row.parentId, [...(rowsByParentId.get(row.parentId) ?? []), row]);
    }
  });
  return rowsByParentId;
}

function countDescendants(
  rowId: string,
  rule: AuditorGroupCountRule,
  rowsByParentId: AuditorRowsByParentId,
): number {
  return (rowsByParentId.get(rowId) ?? []).reduce((total, child) => {
    const counted = child.collapseKey === rule.countedCollapseKey && child.isSitecoreItem === rule.countsSitecoreItems;
    return total + (counted ? 1 : 0) + countDescendants(child.id, rule, rowsByParentId);
  }, 0);
}

function countGroup(
  row: AuditorTreeRow,
  rule: AuditorGroupCountRule,
  rowsByParentId: AuditorRowsByParentId,
  nodesById: ReadonlyMap<string, ReferenceModelNode>,
): AuditorGroupCount {
  const shown = countDescendants(row.id, rule, rowsByParentId);
  const available = nodesById.get(row.id)?.truncation?.availableCount ?? shown;
  return { available: Math.max(available, shown), shown };
}

function layoutsStatus(context: AuditorGroupStatusContext): AuditorGroupStatus {
  const state = resolveBranchLoadState("layouts", context);
  return {
    noun: "layouts",
    state,
    note: state === "not-applicable" ? AUDITOR_GROUP_COPY.NO_LAYOUT : undefined,
  };
}

function statusForModelRow(
  row: AuditorTreeRow,
  context: AuditorGroupStatusContext,
  rowsByParentId: AuditorRowsByParentId,
  nodesById: ReadonlyMap<string, ReferenceModelNode>,
): AuditorGroupStatus | undefined {
  const rule = row.collapseKey ? AUDITOR_GROUP_COUNT_RULES.get(row.collapseKey) : undefined;
  const isLayoutsGroup = row.collapseKey === GRAPH_COLLAPSE_KEY.LAYOUTS;

  return rule
    ? {
        noun: rule.noun ?? row.label.toLowerCase(),
        state: "complete",
        count: countGroup(row, rule, rowsByParentId, nodesById),
      }
    : isLayoutsGroup
      ? layoutsStatus(context)
      : undefined;
}

function placeholderKindFor(status: AuditorGroupStatus | undefined): AuditorPlaceholderKind | undefined {
  const kindByState: Readonly<Record<AuditorGroupLoadState, AuditorPlaceholderKind | undefined>> = {
    auditing: "auditing",
    complete: status?.count?.shown === 0 ? "empty" : undefined,
    failed: "failed",
    "not-applicable": undefined,
  };
  return status ? kindByState[status.state] : undefined;
}

function withPlaceholder(row: AuditorTreeRow, status: AuditorGroupStatus | undefined): AuditorTreeRow[] {
  const decorated: AuditorTreeRow = status ? { ...row, groupStatus: status } : row;
  const kind = placeholderKindFor(status);
  const noun = status?.noun ?? row.label.toLowerCase();
  return kind ? [decorated, createPlaceholderRow(decorated, kind, noun)] : [decorated];
}

// Agent: Parent is a single optional item: until its row exists it is "auditing", and once auditing has settled
// Agent: without one the group is dropped (no parent and a failed lookup look the same, so nothing is claimed).
function parentLoadState(context: AuditorGroupStatusContext): AuditorGroupLoadState | undefined {
  return context.settled ? undefined : "auditing";
}

function syntheticGroupStatus(
  definition: AuditorGroupDefinition,
  context: AuditorGroupStatusContext,
): AuditorGroupStatus {
  const state = resolveBranchLoadState(definition.branch, context);
  const isLayouts = definition.branch === "layouts";
  return {
    noun: definition.noun,
    state,
    count: state === "complete" && !isLayouts ? { available: 0, shown: 0 } : undefined,
    note: state === "not-applicable" ? AUDITOR_GROUP_COPY.NO_LAYOUT : undefined,
  };
}

function syntheticSegment(
  definition: AuditorGroupDefinition,
  root: AuditorTreeRow,
  context: AuditorGroupStatusContext,
): AuditorTreeRow[] {
  const isParent = definition.branch === "parent";
  const parentState = isParent ? parentLoadState(context) : undefined;
  const status: AuditorGroupStatus = parentState
    ? { noun: definition.noun, state: parentState }
    : syntheticGroupStatus(definition, context);
  const groupRow = createSyntheticGroupRow(definition, root, context.rootHarvest.rootItem.scItemId, status);
  return isParent && !parentState ? [] : withPlaceholder(groupRow, groupRow.groupStatus);
}

// Agent: Puts a single-item root branch (parent or template item plus anything below it) under its own group row.
function wrapSegment(
  segment: readonly AuditorTreeRow[],
  root: AuditorTreeRow,
  context: AuditorGroupStatusContext,
): AuditorTreeRow[] {
  const head = segment[0];
  const definition = AUDITOR_WRAPPED_GROUP_DEFINITIONS.find((wrapped) => wrapped.branch === head?.branch);
  const status: AuditorGroupStatus | undefined = definition
    ? { noun: definition.noun, state: "complete", count: { available: 1, shown: 1 } }
    : undefined;
  const group =
    definition && status && head?.parentId === root.id
      ? createSyntheticGroupRow(definition, root, context.rootHarvest.rootItem.scItemId, status)
      : undefined;
  return group
    ? [
        group,
        ...segment.map((row) => ({ ...row, depth: row.depth + 1, parentId: row === head ? group.id : row.parentId })),
      ]
    : Array.from(segment);
}

function segmentRank(segment: readonly AuditorTreeRow[]): number {
  const branch = segment[0]?.branch;
  return (branch ? AUDITOR_BRANCH_ORDER.get(branch) : undefined) ?? AUDITOR_GROUP_STATUS.UNKNOWN_BRANCH_ORDER;
}

function splitRootSegments(root: AuditorTreeRow, rows: readonly AuditorTreeRow[]): AuditorTreeRow[][] {
  return rows.reduce<AuditorTreeRow[][]>((segments, row) => {
    if (row.parentId === root.id || segments.length === 0) {
      segments.push([row]);
    } else {
      segments[segments.length - 1].push(row);
    }
    return segments;
  }, []);
}

function decorateAndOrder(
  root: AuditorTreeRow,
  rows: readonly AuditorTreeRow[],
  nodesById: ReadonlyMap<string, ReferenceModelNode>,
  context: AuditorGroupStatusContext,
): AuditorTreeRow[] {
  const rowsByParentId = indexAuditorRowsByParentId(rows);
  const decorated = rows
    .filter((row) => row !== root)
    .flatMap((row) => withPlaceholder(row, statusForModelRow(row, context, rowsByParentId, nodesById)));
  const presentBranches = new Set(rows.filter((row) => row.parentId === root.id).map((row) => row.branch));
  const syntheticSegments = AUDITOR_GROUP_DEFINITIONS.filter(
    (definition) => context.graphFilters[definition.branch] && !presentBranches.has(definition.branch),
  )
    .map((definition) => syntheticSegment(definition, root, context))
    .filter((segment) => segment.length > 0);
  const modelSegments = splitRootSegments(root, decorated).map((segment) => wrapSegment(segment, root, context));
  const segments = [...modelSegments, ...syntheticSegments];

  return [root, ...segments.sort((left, right) => segmentRank(left) - segmentRank(right)).flat()];
}

// Agent: Auditor-only presentation. The Reference Model (shared with the Graph) is not changed: groups whose data
// Agent: has not arrived, or arrived empty, are added here as synthetic rows, and every group row gets a status
// Agent: (auditing / count / no layout / failed) plus, where useful, a ghosted placeholder child row.
export function applyAuditorGroupStatus(
  rows: readonly AuditorTreeRow[],
  nodesById: ReadonlyMap<string, ReferenceModelNode>,
  context: AuditorGroupStatusContext | undefined,
): AuditorTreeRow[] {
  const root = rows.find((row) => row.parentId === undefined);
  return context && root ? decorateAndOrder(root, rows, nodesById, context) : Array.from(rows);
}
