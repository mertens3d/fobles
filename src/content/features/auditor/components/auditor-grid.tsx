// @source-path [fobles] src/content/features/auditor/components/auditor-grid.tsx
import { useEffect, useMemo, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import {
  AllCommunityModule,
  ModuleRegistry,
  themeQuartz,
  type ColDef,
  type ICellRendererParams,
} from "ag-grid-community";
import type { ReferenceModelNode } from "../../reference-model/reference-model.types";
import { buildAuditReportTree, type AuditReportTreeNode } from "../audit-report-tree";
import type { AuditFinding, AuditFindingStatus } from "../audit-finding.types";
import { AuditorStatusCell } from "./auditor-status-cell";

ModuleRegistry.registerModules([AllCommunityModule]);

export type AuditorGridProps = {
  referenceModelRoot: ReferenceModelNode;
  findings: readonly AuditFinding[];
  onViewData: (treeNodeId: string) => void;
};

function isVisible(
  row: AuditReportTreeNode,
  expanded: ReadonlySet<string>,
  rowsById: ReadonlyMap<string, AuditReportTreeNode>,
): boolean {
  let parentId = row.parentId;
  while (parentId) {
    if (!expanded.has(parentId)) return false;
    parentId = rowsById.get(parentId)?.parentId;
  }
  return true;
}

export function AuditorGrid({ referenceModelRoot, findings, onViewData }: AuditorGridProps) {
  const allRows = useMemo(
    () => buildAuditReportTree(referenceModelRoot, findings),
    [referenceModelRoot, findings],
  );
  const rowsById = useMemo(
    () => new Map(allRows.map((row) => [row.id, row])),
    [allRows],
  );
  const rootIds = useMemo(
    () => allRows.filter((row) => row.parentId === undefined).map((row) => row.id),
    [allRows],
  );
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set());

  useEffect(() => {
    setExpanded((current) => new Set([...current, ...rootIds]));
  }, [rootIds]);

  const visibleRows = useMemo(
    () => allRows.filter((row) => isVisible(row, expanded, rowsById)),
    [allRows, expanded, rowsById],
  );

  function toggle(rowId: string): void {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(rowId)) next.delete(rowId);
      else next.add(rowId);
      return next;
    });
  }

  const columnDefs = useMemo<ColDef<AuditReportTreeNode>[]>(() => [
    {
      field: "status",
      headerName: "",
      width: 58,
      minWidth: 58,
      maxWidth: 58,
      sortable: true,
      cellRenderer: AuditorStatusCell,
    },
    {
      field: "label",
      headerName: "Item / Relationship",
      flex: 1,
      minWidth: 640,
      sortable: true,
      cellRenderer: (params: ICellRendererParams<AuditReportTreeNode>) => {
        const row = params.data;
        if (!row) return null;
        const opened = expanded.has(row.id);

        return (
          <div className={`fobles-auditor-tree-row fobles-auditor-tree-row--${row.kind}`} style={{ paddingLeft: row.depth * 22 }}>
            {row.hasChildren ? (
              <button
                type="button"
                className="fobles-auditor-tree-toggle"
                aria-label={opened ? "Collapse" : "Expand"}
                onClick={() => toggle(row.id)}
              >
                {opened ? "▾" : "▸"}
              </button>
            ) : (
              <span className="fobles-auditor-tree-spacer" />
            )}
            {row.icon ? <img className="fobles-auditor-tree-icon" src={row.icon} alt="" /> : null}
            <span className="fobles-auditor-tree-label">{row.label}</span>
            {row.secondary ? <span className="fobles-auditor-tree-secondary">{row.secondary}</span> : null}
          </div>
        );
      },
    },
    {
      headerName: "Actions",
      width: 120,
      minWidth: 120,
      maxWidth: 120,
      sortable: false,
      cellRenderer: (params: ICellRendererParams<AuditReportTreeNode>) => {
        const treeNodeId = params.data?.referenceModelNodeId;
        return treeNodeId ? (
          <button type="button" onClick={() => onViewData(treeNodeId)}>View Data</button>
        ) : null;
      },
    },
  ], [expanded, onViewData]);

  return (
    <div className="fobles-auditor-grid">
      <AgGridReact<AuditReportTreeNode>
        theme={themeQuartz}
        rowData={visibleRows}
        columnDefs={columnDefs}
        getRowId={(params) => params.data.id}
        getRowClass={(params) => `fobles-auditor-grid-row--${params.data?.kind ?? "finding"}`}
        defaultColDef={{ resizable: true }}
        animateRows={false}
      />
    </div>
  );
}
