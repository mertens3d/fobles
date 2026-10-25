// @source-path [fobles] src/content/features/auditor/components/auditor-grid.tsx

import { useMemo } from "react";
import { AgGridReact } from "ag-grid-react";
import { AllCommunityModule, ModuleRegistry, themeQuartz, type ColDef } from "ag-grid-community";
import type { AuditFinding } from "../audit-finding.types";
import { AuditorItemCell } from "./auditor-item-cell";
import { AuditorStatusCell } from "./auditor-status-cell";

ModuleRegistry.registerModules([AllCommunityModule]);

export type AuditorGridProps = {
  findings: readonly AuditFinding[];
};

// AG Grid Community only - column order is Status/Item/Path/Check/Context/Details, per spec.
export function AuditorGrid({ findings }: AuditorGridProps) {
  const columnDefs = useMemo<ColDef<AuditFinding>[]>(() => [
    { field: "status", headerName: "Status", cellRenderer: AuditorStatusCell, width: 130, sortable: true },
    { field: "itemName", headerName: "Item", cellRenderer: AuditorItemCell, flex: 1, sortable: true },
    { field: "itemPath", headerName: "Path", flex: 2, sortable: true },
    { field: "checkLabel", headerName: "Check", flex: 1, sortable: true },
    { field: "context", headerName: "Context", flex: 1, sortable: true },
    { field: "summary", headerName: "Details", flex: 2, sortable: true },
  ], []);

  return (
    <div className="fobles-auditor-grid">
      <AgGridReact<AuditFinding>
        theme={themeQuartz}
        rowData={findings as AuditFinding[]}
        columnDefs={columnDefs}
        getRowId={(params) => params.data.id}
        animateRows={false}
      />
    </div>
  );
}
