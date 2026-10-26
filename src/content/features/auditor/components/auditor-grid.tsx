// @source-path [fobles] src/content/features/auditor/components/auditor-grid.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import { AllCommunityModule, ModuleRegistry, themeQuartz, type ColDef, type ICellRendererParams, type RowDoubleClickedEvent } from "ag-grid-community";
import type { ProcessingStateByTreeNodeId } from "../../../shared/reference-model-processing/processing-state";
import type { ReferenceModelNode } from "../../reference-model/reference-model.types";
import { getExpandedByCollapseKey, setExpandedStateForCollapseKey } from "../../reference-graph/graph-nodes/graph-collapse-settings";
import { GRAPH_COLLAPSE_KEY, type GraphCollapseKey } from "../../reference-graph/graph-nodes/graph-collapse.types";
import { getGraphPresentationState } from "../../reference-graph/graph-nodes/graph-presentation-state";
import { buildAuditReportTree, type AuditReportTreeNode } from "../audit-report-tree";
import type { AuditFinding } from "../audit-finding.types";
import { AuditorStatusCell } from "./auditor-status-cell";

ModuleRegistry.registerModules([AllCommunityModule]);
const COLLAPSED_GLYPH = "/sitecore/shell/themes/standard/images/treemenu_collapsed.png";
const EXPANDED_GLYPH = "/sitecore/shell/themes/standard/images/treemenu_expanded.png";

type JourneyStage = "referenced" | "cached" | "live" | "tested";
type AuditorTreeRow = AuditReportTreeNode & { collapseKey?: GraphCollapseKey; journeyStage: JourneyStage; sitecoreUrl?: string };
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
function stageIndex(stage: JourneyStage): number { return { referenced: 1, cached: 2, live: 3, tested: 4 }[stage]; }
function JourneyCell({ stage }: { stage: JourneyStage }) {
  const count = stageIndex(stage);
  const title = `${stage[0].toUpperCase()}${stage.slice(1)}: ${count} of 4 lifecycle stages reached`;
  return <span className={`fobles-auditor-journey fobles-auditor-journey--${stage}`} title={title} aria-label={title}>{[0, 1, 2, 3].map((index) => <span key={index} className={index < count ? "is-complete" : undefined} />)}</span>;
}

export function AuditorGrid({ referenceModelRoot, findings, processingStateByTreeNodeId, onViewData }: AuditorGridProps) {
  const nodesById = useMemo(() => { const map = new Map<string, ReferenceModelNode>(); const visit = (node: ReferenceModelNode): void => { map.set(node.treeNodeId, node); node.children.forEach(visit); }; visit(referenceModelRoot); return map; }, [referenceModelRoot]);
  const liveSeen = useRef(new Set<string>());
  processingStateByTreeNodeId.forEach((status, treeNodeId) => { if (status === "enriched" || status === "not-found" || status === "failed") liveSeen.current.add(treeNodeId); });
  const findingsByNode = useMemo(() => { const map = new Map<string, AuditFinding[]>(); findings.forEach((finding) => { if (!finding.referenceModelNodeId) return; const list = map.get(finding.referenceModelNodeId) ?? []; list.push(finding); map.set(finding.referenceModelNodeId, list); }); return map; }, [findings]);
  const baseRows = useMemo(() => buildAuditReportTree(referenceModelRoot, findings, processingStateByTreeNodeId), [referenceModelRoot, findings, processingStateByTreeNodeId]);
  const allRows = useMemo<AuditorTreeRow[]>(() => {
    const results: AuditorTreeRow[] = [];
    const findingRowsByParent = new Map<string, AuditReportTreeNode[]>();
    baseRows.filter((row) => row.kind === "finding" && row.parentId).forEach((row) => { const list = findingRowsByParent.get(row.parentId!) ?? []; list.push(row); findingRowsByParent.set(row.parentId!, list); });
    baseRows.filter((row) => row.kind !== "finding").forEach((row) => {
      const node = row.referenceModelNodeId ? nodesById.get(row.referenceModelNodeId) : undefined;
      const nodeFindings = row.referenceModelNodeId ? findingsByNode.get(row.referenceModelNodeId) ?? [] : [];
      const processingStatus = row.referenceModelNodeId ? processingStateByTreeNodeId.get(row.referenceModelNodeId) : undefined;
      const tested = nodeFindings.some((finding) => finding.status !== "pending");
      const live = Boolean(row.referenceModelNodeId && liveSeen.current.has(row.referenceModelNodeId));
      const cached = processingStatus === "verified" || processingStatus === "stale" || processingStatus === "unverified";
      const journeyStage: JourneyStage = tested ? "tested" : live ? "live" : cached ? "cached" : "referenced";
      const sitecoreUrl = nodeFindings.find((finding) => finding.sitecoreUrl)?.sitecoreUrl;
      results.push({ ...row, collapseKey: node ? graphCollapseKey(node, referenceModelRoot.treeNodeId) : undefined, journeyStage, sitecoreUrl });
      const tests = findingRowsByParent.get(row.id) ?? [];
      if (tests.length) {
        const testsId = `${row.id}:tests`;
        results.push({ id: testsId, parentId: row.id, depth: row.depth + 1, kind: "reference-model", label: "Tests", details: undefined, path: undefined, origin: undefined, status: row.status, hasChildren: true, referenceModelNodeId: row.referenceModelNodeId, icon: undefined, finding: undefined, collapseKey: GRAPH_COLLAPSE_KEY.TESTS, journeyStage, sitecoreUrl });
        tests.forEach((test) => results.push({ ...test, parentId: testsId, depth: row.depth + 2, journeyStage: test.status === "pending" ? journeyStage : "tested", sitecoreUrl: test.finding?.sitecoreUrl }));
      }
    });
    return results;
  }, [baseRows, findingsByNode, nodesById, processingStateByTreeNodeId, referenceModelRoot.treeNodeId]);
  const rowsById = useMemo(() => new Map(allRows.map((row) => [row.id, row])), [allRows]);
  const expandableIds = useMemo(() => allRows.filter((row) => row.hasChildren).map((row) => row.id), [allRows]);
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set());
  const initialized = useRef(false);
  useEffect(() => { if (initialized.current) return; initialized.current = true; void getExpandedByCollapseKey().then((saved) => { setExpanded(new Set(allRows.filter((row) => row.hasChildren && (!row.collapseKey || saved[row.collapseKey])).map((row) => row.id))); }); }, [allRows]);
  const visibleRows = useMemo(() => allRows.filter((row) => isVisible(row, expanded, rowsById)), [allRows, expanded, rowsById]);
  function descendantIds(rowId: string): string[] { const ids: string[] = []; const visit = (parentId: string): void => { allRows.filter((row) => row.parentId === parentId && row.hasChildren).forEach((row) => { ids.push(row.id); visit(row.id); }); }; visit(rowId); return ids; }
  function toggle(row: AuditorTreeRow, event?: { shiftKey?: boolean; ctrlKey?: boolean; metaKey?: boolean }): void { if (!row.hasChildren) return; const opening = !expanded.has(row.id); setExpanded((current) => { const next = new Set(current); const targets = event?.shiftKey ? [row.id, ...descendantIds(row.id)] : event?.ctrlKey || event?.metaKey ? allRows.filter((candidate) => candidate.hasChildren && candidate.collapseKey === row.collapseKey).map((candidate) => candidate.id) : [row.id]; targets.forEach((id) => opening ? next.add(id) : next.delete(id)); return next; }); if (row.collapseKey) void setExpandedStateForCollapseKey(row.collapseKey, opening); }
  function navigate(row: AuditorTreeRow): void { if (row.sitecoreUrl) window.open(row.sitecoreUrl, "_blank", "noopener,noreferrer"); }
  const columnDefs = useMemo<ColDef<AuditorTreeRow>[]>(() => [
    { field: "status", headerName: "", width: 54, minWidth: 54, maxWidth: 54, cellRenderer: AuditorStatusCell },
    { field: "journeyStage", headerName: "", width: 72, minWidth: 72, maxWidth: 72, cellRenderer: (params: ICellRendererParams<AuditorTreeRow>) => params.data ? <JourneyCell stage={params.data.journeyStage} /> : null },
    { headerName: "", width: 44, minWidth: 44, maxWidth: 44, cellClass: "fobles-auditor-navigate-cell", cellRenderer: (params: ICellRendererParams<AuditorTreeRow>) => params.data?.sitecoreUrl ? <button type="button" className="fobles-auditor-navigate" title="Navigate to item in a new tab" aria-label="Navigate to item in a new tab" onClick={(event) => { event.stopPropagation(); navigate(params.data!); }}>◎</button> : null },
    { field: "label", headerName: "Item / Relationship", flex: 1, minWidth: 300, cellClass: "fobles-auditor-selectable", cellRenderer: (params: ICellRendererParams<AuditorTreeRow>) => { const row = params.data; if (!row) return null; const opened = expanded.has(row.id); return <div className={`fobles-auditor-tree-row fobles-auditor-tree-row--${row.kind}`} style={{ paddingLeft: row.depth * 24 }}>{row.hasChildren ? <button type="button" className="fobles-auditor-tree-toggle" onClick={(event) => { event.stopPropagation(); toggle(row, event); }}><img src={opened ? EXPANDED_GLYPH : COLLAPSED_GLYPH} alt="" /></button> : <span className="fobles-auditor-tree-spacer" />}{row.icon ? <img className="fobles-auditor-tree-icon" src={row.icon} alt="" /> : null}<span className="fobles-auditor-tree-label">{row.label}</span></div>; } },
    { field: "details", headerName: "Details", flex: 1, minWidth: 260, cellClass: "fobles-auditor-selectable" },
    { field: "path", headerName: "Path", flex: 1, minWidth: 240, cellClass: "fobles-auditor-selectable" },
    { headerName: "Actions", width: 110, cellRenderer: (params: ICellRendererParams<AuditorTreeRow>) => params.data?.referenceModelNodeId ? <button type="button" onClick={(event) => { event.stopPropagation(); onViewData(params.data!.referenceModelNodeId!); }}>View Data</button> : null },
  ], [allRows, expanded, onViewData]);
  function handleRowDoubleClick(event: RowDoubleClickedEvent<AuditorTreeRow>): void { const target = event.event?.target; if (target instanceof Element && target.closest("button, a, input, select, textarea")) return; if (event.data) toggle(event.data); }
  return <div className="fobles-auditor-grid-shell"><div className="fobles-auditor-tree-actions"><span className="fobles-auditor-journey-legend"><span>▰▱▱▱ Referenced</span><span>▰▰▱▱ Cached</span><span>▰▰▰▱ Live</span><span>▰▰▰▰ Tested</span></span><button type="button" onClick={() => setExpanded(new Set(expandableIds))}>Expand All</button><button type="button" onClick={() => setExpanded(new Set())}>Collapse All</button></div><div className="fobles-auditor-grid"><AgGridReact<AuditorTreeRow> theme={themeQuartz} rowData={visibleRows} columnDefs={columnDefs} getRowId={(params) => params.data.id} defaultColDef={{ resizable: true }} enableCellTextSelection ensureDomOrder onRowDoubleClicked={handleRowDoubleClick} animateRows={false} /></div></div>;
}
