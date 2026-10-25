// @source-path [fobles] src/content/features/auditor/components/auditor-grid.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import { AllCommunityModule, ModuleRegistry, themeQuartz, type ColDef, type ICellRendererParams } from "ag-grid-community";
import type { ProcessingStateByTreeNodeId } from "../../../shared/reference-model-processing/processing-state";
import type { ReferenceModelNode } from "../../reference-model/reference-model.types";
import { getExpandedByCollapseKey, setExpandedStateForCollapseKey } from "../../reference-graph/graph-nodes/graph-collapse-settings";
import { GRAPH_COLLAPSE_KEY, type GraphCollapseKey } from "../../reference-graph/graph-nodes/graph-collapse.types";
import { getGraphPresentationState } from "../../reference-graph/graph-nodes/graph-presentation-state";
import { buildAuditReportTree, type AuditDataOrigin, type AuditReportTreeNode } from "../audit-report-tree";
import type { AuditFinding } from "../audit-finding.types";
import { AuditorStatusCell } from "./auditor-status-cell";

ModuleRegistry.registerModules([AllCommunityModule]);
const COLLAPSED_GLYPH = "/sitecore/shell/themes/standard/images/treemenu_collapsed.png";
const EXPANDED_GLYPH = "/sitecore/shell/themes/standard/images/treemenu_expanded.png";
const ORIGIN_GLYPH: Readonly<Record<Exclude<AuditDataOrigin, undefined>, string>> = { Referenced: "↗", Cached: "◆", Live: "●" };

type AuditorTreeRow = AuditReportTreeNode & { collapseKey?: GraphCollapseKey };
export type AuditorGridProps = { referenceModelRoot: ReferenceModelNode; findings: readonly AuditFinding[]; processingStateByTreeNodeId: ProcessingStateByTreeNodeId; onViewData: (treeNodeId: string) => void; };

function isVisible(row: AuditorTreeRow, expanded: ReadonlySet<string>, rowsById: ReadonlyMap<string, AuditorTreeRow>): boolean { let parentId = row.parentId; while (parentId) { if (!expanded.has(parentId)) return false; parentId = rowsById.get(parentId)?.parentId; } return true; }
function graphCollapseKey(node: ReferenceModelNode, rootId: string): GraphCollapseKey | undefined {
  if (node.treeNodeId === rootId) return GRAPH_COLLAPSE_KEY.ROOT;
  const state = getGraphPresentationState(node);
  if (state.branch === "layouts") return GRAPH_COLLAPSE_KEY.LAYOUTS;
  if (state.branch === "customFields") return GRAPH_COLLAPSE_KEY.CUSTOM_FIELDS;
  if (state.branch === "standardFields") return GRAPH_COLLAPSE_KEY.STANDARD_FIELDS;
  if (state.branch === "template") return GRAPH_COLLAPSE_KEY.TEMPLATE;
  if (state.branch === "referrers") return GRAPH_COLLAPSE_KEY.REFERRERS;
  if (state.branch === "children") return GRAPH_COLLAPSE_KEY.CHILDREN;
  if (state.branch === "parent") return GRAPH_COLLAPSE_KEY.PARENT;
  const kind = state.kind.toLowerCase().replace(/\s+/g, "");
  const byKind: Record<string, GraphCollapseKey> = { placeholder: GRAPH_COLLAPSE_KEY.PLACEHOLDER, rendering: GRAPH_COLLAPSE_KEY.RENDERING, datasource: GRAPH_COLLAPSE_KEY.DATASOURCE, device: GRAPH_COLLAPSE_KEY.DEVICE, field: GRAPH_COLLAPSE_KEY.FIELD, section: GRAPH_COLLAPSE_KEY.SECTION, renderingparameter: GRAPH_COLLAPSE_KEY.RENDERING_PARAMETER, renderingparameters: GRAPH_COLLAPSE_KEY.RENDERING_PARAMETERS };
  return byKind[kind];
}

export function AuditorGrid({ referenceModelRoot, findings, processingStateByTreeNodeId, onViewData }: AuditorGridProps) {
  const nodesById = useMemo(() => { const map = new Map<string, ReferenceModelNode>(); const visit = (node: ReferenceModelNode): void => { map.set(node.treeNodeId, node); node.children.forEach(visit); }; visit(referenceModelRoot); return map; }, [referenceModelRoot]);
  const baseRows = useMemo(() => buildAuditReportTree(referenceModelRoot, findings, processingStateByTreeNodeId), [referenceModelRoot, findings, processingStateByTreeNodeId]);
  const allRows = useMemo<AuditorTreeRow[]>(() => {
    const results: AuditorTreeRow[] = [];
    const findingsByParent = new Map<string, AuditReportTreeNode[]>();
    baseRows.filter((row) => row.kind === "finding" && row.parentId).forEach((row) => { const list = findingsByParent.get(row.parentId!) ?? []; list.push(row); findingsByParent.set(row.parentId!, list); });
    baseRows.filter((row) => row.kind !== "finding").forEach((row) => {
      const node = row.referenceModelNodeId ? nodesById.get(row.referenceModelNodeId) : undefined;
      results.push({ ...row, collapseKey: node ? graphCollapseKey(node, referenceModelRoot.treeNodeId) : undefined });
      const tests = findingsByParent.get(row.id) ?? [];
      if (tests.length) {
        const testsId = `${row.id}:tests`;
        results.push({ id: testsId, parentId: row.id, depth: row.depth + 1, kind: "reference-model", label: "Tests", details: undefined, path: undefined, origin: undefined, status: row.status, hasChildren: true, referenceModelNodeId: row.referenceModelNodeId, icon: undefined, finding: undefined, collapseKey: GRAPH_COLLAPSE_KEY.TESTS });
        tests.forEach((test) => results.push({ ...test, parentId: testsId, depth: row.depth + 2 }));
      }
    });
    return results;
  }, [baseRows, nodesById, referenceModelRoot.treeNodeId]);
  const rowsById = useMemo(() => new Map(allRows.map((row) => [row.id, row])), [allRows]);
  const expandableIds = useMemo(() => allRows.filter((row) => row.hasChildren).map((row) => row.id), [allRows]);
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set());
  const initialized = useRef(false);
  useEffect(() => { if (initialized.current) return; initialized.current = true; void getExpandedByCollapseKey().then((saved) => { setExpanded(new Set(allRows.filter((row) => row.hasChildren && (!row.collapseKey || saved[row.collapseKey])).map((row) => row.id))); }); }, [allRows]);
  const visibleRows = useMemo(() => allRows.filter((row) => isVisible(row, expanded, rowsById)), [allRows, expanded, rowsById]);
  function descendantIds(rowId: string): string[] { const ids: string[] = []; const visit = (parentId: string): void => { allRows.filter((row) => row.parentId === parentId && row.hasChildren).forEach((row) => { ids.push(row.id); visit(row.id); }); }; visit(rowId); return ids; }
  function toggle(row: AuditorTreeRow, event: React.MouseEvent): void {
    const opening = !expanded.has(row.id);
    setExpanded((current) => { const next = new Set(current); const targets = event.shiftKey ? [row.id, ...descendantIds(row.id)] : event.ctrlKey || event.metaKey ? allRows.filter((candidate) => candidate.hasChildren && candidate.collapseKey === row.collapseKey).map((candidate) => candidate.id) : [row.id]; targets.forEach((id) => opening ? next.add(id) : next.delete(id)); return next; });
    if (row.collapseKey) void setExpandedStateForCollapseKey(row.collapseKey, opening);
  }
  const columnDefs = useMemo<ColDef<AuditorTreeRow>[]>(() => [
    { field: "status", headerName: "", width: 54, minWidth: 54, maxWidth: 54, cellRenderer: AuditorStatusCell },
    { field: "origin", headerName: "", width: 54, minWidth: 54, maxWidth: 54, cellRenderer: (params: ICellRendererParams<AuditorTreeRow>) => params.data?.origin ? <span className={`fobles-auditor-origin fobles-auditor-origin--${params.data.origin.toLowerCase()}`} title={params.data.origin}>{ORIGIN_GLYPH[params.data.origin]}</span> : null },
    { field: "label", headerName: "Item / Relationship", flex: 1, minWidth: 300, cellRenderer: (params: ICellRendererParams<AuditorTreeRow>) => { const row = params.data; if (!row) return null; const opened = expanded.has(row.id); return <div className={`fobles-auditor-tree-row fobles-auditor-tree-row--${row.kind}`} style={{ paddingLeft: row.depth * 24 }}>{row.hasChildren ? <button type="button" className="fobles-auditor-tree-toggle" title="Click: toggle node\nCtrl/Cmd+Click: toggle all nodes of this kind\nShift+Click: toggle subtree" onClick={(event) => toggle(row, event)}><img src={opened ? EXPANDED_GLYPH : COLLAPSED_GLYPH} alt="" /></button> : <span className="fobles-auditor-tree-spacer" />}{row.icon ? <img className="fobles-auditor-tree-icon" src={row.icon} alt="" /> : null}<span className="fobles-auditor-tree-label">{row.label}</span></div>; } },
    { field: "details", headerName: "Details", flex: 1, minWidth: 260 },
    { field: "path", headerName: "Path", flex: 1, minWidth: 240 },
    { headerName: "Actions", width: 110, cellRenderer: (params: ICellRendererParams<AuditorTreeRow>) => params.data?.referenceModelNodeId ? <button type="button" onClick={() => onViewData(params.data!.referenceModelNodeId!)}>View Data</button> : null },
  ], [allRows, expanded, onViewData]);
  return <div className="fobles-auditor-grid-shell"><div className="fobles-auditor-tree-actions"><span className="fobles-auditor-origin-legend"><span className="fobles-auditor-origin--referenced">↗ Referenced</span><span className="fobles-auditor-origin--cached">◆ Cached</span><span className="fobles-auditor-origin--live">● Live</span></span><button type="button" onClick={() => setExpanded(new Set(expandableIds))}>Expand All</button><button type="button" onClick={() => setExpanded(new Set())}>Collapse All</button></div><div className="fobles-auditor-grid"><AgGridReact<AuditorTreeRow> theme={themeQuartz} rowData={visibleRows} columnDefs={columnDefs} getRowId={(params) => params.data.id} defaultColDef={{ resizable: true }} animateRows={false} /></div></div>;
}
