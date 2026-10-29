// @source-path [fobles] src/content/features/auditor/auditor-grid/auditor-layout-row-filter.ts

import type { AuditorLayoutViewKey, AuditorLayoutViewSettings } from "../auditor-layout-view-settings";
import type { AuditorTreeRow } from "./auditor-grid.types";

function rowLayoutViewKey(row: AuditorTreeRow): AuditorLayoutViewKey | undefined {
  const label = row.label.toLowerCase();
  if (label.includes("(device)")) return "device";
  if (label.startsWith("page layout")) return "page-layout";
  if (label.includes("(placeholder)")) return "placeholder";
  if (label.includes("(datasource)")) return "datasource";
  if (label === "rendering parameters" || label.includes("(parameter)")) return "parameter";
  if (label.includes("(rendering)")) return "rendering";
  return undefined;
}

export function applyAuditorLayoutView(rows: readonly AuditorTreeRow[], settings: AuditorLayoutViewSettings): AuditorTreeRow[] {
  const hiddenIds = new Set(rows.filter((row) => {
    const key = rowLayoutViewKey(row);
    return key !== undefined && !settings[key];
  }).map((row) => row.id));

  if (hiddenIds.size === 0) return Array.from(rows);

  const rowsById = new Map(rows.map((row) => [row.id, row]));

  return rows
    .filter((row) => !hiddenIds.has(row.id))
    .map((row) => {
      let parentId = row.parentId;
      let removedDepth = 0;

      while (parentId && hiddenIds.has(parentId)) {
        removedDepth += 1;
        parentId = rowsById.get(parentId)?.parentId;
      }

      return removedDepth === 0 ? row : { ...row, parentId, depth: Math.max(0, row.depth - removedDepth) };
    });
}
