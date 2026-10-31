// @source-path [fobles] src/content/features/auditor/auditor-grid/auditor-expansion-state.ts

import type { AuditorTreeRow } from "./auditor-grid.types";

export function isAuditorRowVisible(row: AuditorTreeRow, expanded: ReadonlySet<string>, rowsById: ReadonlyMap<string, AuditorTreeRow>): boolean {
  let parentId = row.parentId;

  while (parentId) {
    if (!expanded.has(parentId)) return false;
    parentId = rowsById.get(parentId)?.parentId;
  }

  return true;
}

export function descendantExpandableIds(rowId: string, rows: readonly AuditorTreeRow[]): string[] {
  const ids: string[] = [];

  function visit(parentId: string): void {
    rows
      .filter((row) => row.parentId === parentId && row.hasChildren)
      .forEach((row) => {
        ids.push(row.id);
        visit(row.id);
      });
  }

  visit(rowId);
  return ids;
}

export function reconcileExpandedRows(current: ReadonlySet<string>, explicitlyCollapsed: ReadonlySet<string>, rows: readonly AuditorTreeRow[], rowsById: ReadonlyMap<string, AuditorTreeRow>): ReadonlySet<string> {
  const next = new Set(Array.from(current).filter((id) => rowsById.get(id)?.hasChildren));
  let changed = next.size !== current.size;

  rows.forEach((row) => {
    if (!row.hasChildren || next.has(row.id) || explicitlyCollapsed.has(row.id)) return;

    const parentVisible = !row.parentId || next.has(row.parentId);
    if (!parentVisible) return;

    next.add(row.id);
    changed = true;
  });

  return changed ? next : current;
}
