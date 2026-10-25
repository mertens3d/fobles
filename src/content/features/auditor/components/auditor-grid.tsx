// @source-path [fobles] src/content/features/auditor/components/auditor-grid.tsx
import { useEffect, useMemo, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import { AllCommunityModule, ModuleRegistry, themeQuartz, type ColDef, type ICellRendererParams } from "ag-grid-community";
import type { ProcessingStateByTreeNodeId } from "../../../shared/reference-model-processing/processing-state";
import type { ReferenceModelNode } from "../../reference-model/reference-model.types";
import { buildAuditReportTree, type AuditDataOrigin, type AuditReportTreeNode } from "../audit-report-tree";
import type { AuditFinding } from "../audit-finding.types";
import { AuditorStatusCell } from "./auditor-status-cell";

ModuleRegistry.registerModules([AllCommunityModule]);
const COLLAPSED_GLYPH = "/sitecore/shell/themes/standard/images/treemenu_collapsed.png";
const EXPANDED_GLYPH = "/sitecore/shell/themes/standard/images/treemenu_expanded.png";
const ORIGIN_GLYPH: Readonly<Record<Exclude<AuditDataOrigin, undefined>, string>> = { Referenced: "↗", Cached: "◆", Live: "●" };

export type AuditorGridProps = {
  referenceModelRoot: ReferenceModelNode;
  findings: readonly AuditFinding[];
  processingStateByTreeNodeId: ProcessingStateByTreeNodeId;
  onViewData: (treeNodeId: string) => void;
};

function isVisible(row: AuditReportTreeNode, expanded: ReadonlySet<string>, rowsById: ReadonlyMap<string, AuditReportTreeNode>): boolean {
  let parentId = row.parentId;
  while (parentId) {
    if (!expanded.has(parentId)) return false;
    parentId = rowsById.get(parentId)?.parentId;
  }
  return true;
}

export function AuditorGrid({ referenceModelRoot, findings, processingStateByTreeNodeId, onViewData }: AuditorGridProps) {
  const allRows = useMemo(
    () => buildAuditReportTree(referenceModelRoot, findings, processingStateByTreeNodeId),
    [referenceModelRoot, findings, processingStateByTreeNodeId],
  );
  const rowsById = useMemo(() => new Map(allRows.map((row) => [row.id, row])), [allRows]);
  const expandableIds = useMemo(() => allRows.filter((row) => row.hasChildren).map((row) => row.id), [allRows]);
  const rootIds = useMemo(() => allRows.filter((row) => row.parentId === undefined).map((row) => row.id), [allRows]);
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set());

  useEffect(() => { setExpanded((current) => new Set([...current, ...rootIds])); }, [rootIds]);
  const visibleRows = useMemo(() => allRows.filter((row) => isVisible(row, expanded, rowsById)), [allRows, expanded, rowsById]);

  function descendantIds(rowId: string): string[] {
    const ids: string[] = [];
    const visit = (parentId: string): void => {
      allRows.filter((row) => row.parentId === parentId && row.hasChildren).forEach((row) => { ids.push(row.id); visit(row.id); });
    };
    visit(rowId);
    return ids;
  }

  function toggle(row: AuditReportTreeNode, event: React.MouseEvent): void {
    setExpanded((current) => {
      const next = new Set(current);
      const opening = !next.has(row.id);
      const targets = event.shiftKey
        ? [row.id, ...descendantIds(row.id)]
        : event.ctrlKey || event.metaKey
          ? expandableIds
          : [row.id];
      targets.forEach((id) => opening ? next.add(id) : next.delete(id));
      return next;
    });
  }

  const columnDefs = useMemo<ColDef<AuditReportTreeNode>[]>(() => [
    { field: "status", headerName: "", width: 54, minWidth: 54, maxWidth: 54, sortable: true, cellRenderer: AuditorStatusCell },
    {
      field: "origin", headerName: "", width: 54, minWidth: 54, maxWidth: 54, sortable: true,
      cellRenderer: (params: ICellRendererParams<AuditReportTreeNode>) => params.data?.origin
        ? <span className={`fobles-auditor-origin fobles-auditor-origin--${params.data.origin.toLowerCase()}`} title={params.data.origin}>{ORIGIN_GLYPH[params.data.origin]}</span>
        : null,
    },
    {
      field: "label", headerName: "Item / Relationship", flex: 1, minWidth: 320, sortable: true,
      cellRenderer: (params: ICellRendererParams<AuditReportTreeNode>) => {
        const row = params.data;
        if (!row) return null;
        const opened = expanded.has(row.id);
        return <div className={`fobles-auditor-tree-row fobles-auditor-tree-row--${row.kind}`} style={{ paddingLeft: row.depth * 18 }}>
          {row.hasChildren ? <button type="button" className="fobles-auditor-tree-toggle" title="Click: toggle node\nCtrl/Cmd+Click: toggle matching nodes\nShift+Click: toggle subtree" aria-label={opened ? "Collapse" : "Expand"} onClick={(event) => toggle(row, event)}><img src={opened ? EXPANDED_GLYPH : COLLAPSED_GLYPH} alt="" /></button> : <span className="fobles-auditor-tree-spacer" />}
          {row.icon ? <img className="fobles-auditor-tree-icon" src={row.icon} alt="" /> : null}
          <span className="fobles-auditor-tree-label">{row.label}</span>
        </div>;
      },
    },
    { field: "details", headerName: "Details", flex: 1, minWidth: 280, sortable: true },
    { field: "path", headerName: "Path", flex: 1, minWidth: 260, sortable: true },
    {
      headerName: "Actions", width: 120, minWidth: 120, maxWidth: 120, sortable: false,
      cellRenderer: (params: ICellRendererParams<AuditReportTreeNode>) => {
        const treeNodeId = params.data?.referenceModelNodeId;
        return treeNodeId ? <button type="button" onClick={() => onViewData(treeNodeId)}>View Data</button> : null;
      },
    },
  ], [allRows, expandableIds, expanded, onViewData]);

  return <div className="fobles-auditor-grid-shell">
    <div className="fobles-auditor-tree-actions">
      <span className="fobles-auditor-origin-legend"><span className="fobles-auditor-origin--referenced">↗ Referenced</span><span className="fobles-auditor-origin--cached">◆ Cached</span><span className="fobles-auditor-origin--live">● Live</span></span>
      <button type="button" onClick={() => setExpanded(new Set(expandableIds))}>Expand All</button>
      <button type="button" onClick={() => setExpanded(new Set(rootIds))}>Collapse All</button>
    </div>
    <div className="fobles-auditor-grid">
      <AgGridReact<AuditReportTreeNode> theme={themeQuartz} rowData={visibleRows} columnDefs={columnDefs} getRowId={(params) => params.data.id} getRowClass={(params) => `fobles-auditor-grid-row--${params.data?.kind ?? "finding"}`} defaultColDef={{ resizable: true }} animateRows={false} />
    </div>
  </div>;
}
