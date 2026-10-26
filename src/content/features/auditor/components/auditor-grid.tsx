// @source-path [fobles] src/content/features/auditor/components/auditor-grid.tsx

import { useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import { AgGridReact } from "ag-grid-react";
import {
  AllCommunityModule,
  ModuleRegistry,
  themeQuartz,
  type ColDef,
  type ICellRendererParams,
  type RowDoubleClickedEvent,
} from "ag-grid-community";
import type { ReferenceModelNode } from "../../../foundation/reference-data/model/reference-model.types";
import type { ProcessingStateByTreeNodeId } from "../../../foundation/reference-data/processing/processing-state";
import { getExpandedByCollapseKey, setExpandedStateForCollapseKey } from "../../reference-graph/graph-nodes/graph-collapse-settings";
import { GRAPH_COLLAPSE_KEY, type GraphCollapseKey } from "../../../foundation/reference-data/model/graph-collapse.types";
import { getGraphPresentationState } from "../../../foundation/reference-data/model/graph-presentation-state";
import type { AuditFinding } from "../audit-finding.types";
import { buildAuditReportTree, type AuditReportTreeNode } from "../audit-report-tree";
import { AuditorStatusCell } from "./auditor-status-cell";

ModuleRegistry.registerModules([AllCommunityModule]);

const COLLAPSED_GLYPH = "/sitecore/shell/themes/standard/images/treemenu_collapsed.png";
const EXPANDED_GLYPH = "/sitecore/shell/themes/standard/images/treemenu_expanded.png";

type JourneyStage = "referenced" | "cached" | "live" | "tested";

type AuditorTreeRow = AuditReportTreeNode & {
  collapseKey?: GraphCollapseKey;
  journeyStage: JourneyStage;
  sitecoreUrl?: string;
  isSitecoreItem: boolean;
};

export type AuditorGridProps = {
  referenceModelRoot: ReferenceModelNode;
  findings: readonly AuditFinding[];
  processingStateByTreeNodeId: ProcessingStateByTreeNodeId;
  onViewData: (treeNodeId: string) => void;
  onViewTestDetails: (finding: AuditFinding) => void;
};

type ToggleModifiers = { shiftKey?: boolean; ctrlKey?: boolean; metaKey?: boolean };

const JOURNEY_RANK: Record<JourneyStage, number> = { referenced: 1, cached: 2, live: 3, tested: 4 };
const JOURNEY_BY_RANK: Record<number, JourneyStage> = { 1: "referenced", 2: "cached", 3: "live", 4: "tested" };

function isVisible(
  row: AuditorTreeRow,
  expanded: ReadonlySet<string>,
  rowsById: ReadonlyMap<string, AuditorTreeRow>,
): boolean {
  let parentId = row.parentId;

  while (parentId) {
    if (!expanded.has(parentId)) return false;
    parentId = rowsById.get(parentId)?.parentId;
  }

  return true;
}

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

  return ({
    placeholder: GRAPH_COLLAPSE_KEY.PLACEHOLDER,
    rendering: GRAPH_COLLAPSE_KEY.RENDERING,
    datasource: GRAPH_COLLAPSE_KEY.DATASOURCE,
    device: GRAPH_COLLAPSE_KEY.DEVICE,
    field: GRAPH_COLLAPSE_KEY.FIELD,
    section: GRAPH_COLLAPSE_KEY.SECTION,
    renderingparameter: GRAPH_COLLAPSE_KEY.RENDERING_PARAMETER,
    renderingparameters: GRAPH_COLLAPSE_KEY.RENDERING_PARAMETERS,
  } as Record<string, GraphCollapseKey>)[kind];
}

// The second mousedown of a double-click is what selects a word, and a selection is what raises the browser's own
// selection toolbar (copy / search / Copilot). The tree uses double-click to expand a row, so suppress the selection.
// AG Grid detects double-clicks from the dblclick event, so this does not interfere with row expansion.
function blockDoubleClickTextSelection(event: ReactMouseEvent<HTMLDivElement>): void {
  if (event.detail > 1) event.preventDefault();
}

function clearTextSelection(source: Event | null | undefined): void {
  const target = source?.target;
  const targetDocument = target instanceof Node ? target.ownerDocument ?? document : document;

  targetDocument.getSelection()?.removeAllRanges();
}

function JourneyCell({ stage }: { stage: JourneyStage }) {
  const count = JOURNEY_RANK[stage];
  const title = `${stage[0].toUpperCase()}${stage.slice(1)}: ${count} of 4 lifecycle stages reached`;

  return (
    <span className={`fobles-auditor-journey fobles-auditor-journey--${stage}`} title={title} aria-label={title}>
      {[0, 1, 2, 3].map((index) => (
        <span key={index} className={index < count ? "is-complete" : undefined} />
      ))}
    </span>
  );
}

export function AuditorGrid({
  referenceModelRoot,
  findings,
  processingStateByTreeNodeId,
  onViewData,
  onViewTestDetails,
}: AuditorGridProps) {
  const nodesById = useMemo(() => {
    const map = new Map<string, ReferenceModelNode>();

    const visit = (node: ReferenceModelNode): void => {
      map.set(node.treeNodeId, node);
      node.children.forEach(visit);
    };

    visit(referenceModelRoot);

    return map;
  }, [referenceModelRoot]);

  const liveSeen = useRef(new Set<string>());

  processingStateByTreeNodeId.forEach((status, treeNodeId) => {
    if (status === "enriched" || status === "not-found" || status === "failed") liveSeen.current.add(treeNodeId);
  });

  const findingsByNode = useMemo(() => {
    const map = new Map<string, AuditFinding[]>();

    findings.forEach((finding) => {
      if (!finding.referenceModelNodeId) return;

      const list = map.get(finding.referenceModelNodeId) ?? [];

      list.push(finding);
      map.set(finding.referenceModelNodeId, list);
    });

    return map;
  }, [findings]);

  const baseRows = useMemo(
    () => buildAuditReportTree(referenceModelRoot, findings, processingStateByTreeNodeId),
    [referenceModelRoot, findings, processingStateByTreeNodeId],
  );

  const allRows = useMemo<AuditorTreeRow[]>(() => {
    const results: AuditorTreeRow[] = [];
    const findingsByParent = new Map<string, AuditReportTreeNode[]>();

    baseRows
      .filter((row) => row.kind === "finding" && row.parentId)
      .forEach((row) => {
        const list = findingsByParent.get(row.parentId!) ?? [];

        list.push(row);
        findingsByParent.set(row.parentId!, list);
      });

    baseRows
      .filter((row) => row.kind !== "finding")
      .forEach((row) => {
        const node = row.referenceModelNodeId ? nodesById.get(row.referenceModelNodeId) : undefined;
        const nodeFindings = row.referenceModelNodeId ? findingsByNode.get(row.referenceModelNodeId) ?? [] : [];
        const processingStatus = row.referenceModelNodeId
          ? processingStateByTreeNodeId.get(row.referenceModelNodeId)
          : undefined;
        const allTerminal = nodeFindings.length > 0 && nodeFindings.every((finding) => finding.status !== "pending");
        const live = Boolean(row.referenceModelNodeId && liveSeen.current.has(row.referenceModelNodeId));
        const cached = processingStatus === "verified" || processingStatus === "stale" || processingStatus === "unverified";
        const ownStage: JourneyStage = allTerminal ? "tested" : live ? "live" : cached ? "cached" : "referenced";
        const sitecoreUrl = nodeFindings.find((finding) => finding.sitecoreUrl)?.sitecoreUrl;

        results.push({
          ...row,
          collapseKey: node ? graphCollapseKey(node, referenceModelRoot.treeNodeId) : undefined,
          journeyStage: ownStage,
          sitecoreUrl,
          isSitecoreItem: node?.nodeType === "item",
        });

        const tests = findingsByParent.get(row.id) ?? [];

        if (tests.length === 0) return;

        const testsId = `${row.id}:tests`;

        results.push({
          id: testsId,
          parentId: row.id,
          depth: row.depth + 1,
          kind: "reference-model",
          label: "Tests",
          details: undefined,
          path: undefined,
          origin: undefined,
          status: row.status,
          hasChildren: true,
          referenceModelNodeId: row.referenceModelNodeId,
          icon: undefined,
          finding: undefined,
          collapseKey: GRAPH_COLLAPSE_KEY.TESTS,
          journeyStage: tests.every((test) => test.status !== "pending") ? "tested" : ownStage,
          sitecoreUrl: undefined,
          isSitecoreItem: false,
        });

        tests.forEach((test) => {
          results.push({
            ...test,
            parentId: testsId,
            depth: row.depth + 2,
            journeyStage: test.status === "pending" ? ownStage : "tested",
            sitecoreUrl: undefined,
            isSitecoreItem: false,
          });
        });
      });

    const childrenByParent = new Map<string, AuditorTreeRow[]>();

    results.forEach((row) => {
      if (!row.parentId) return;

      const list = childrenByParent.get(row.parentId) ?? [];

      list.push(row);
      childrenByParent.set(row.parentId, list);
    });

    const rollup = (row: AuditorTreeRow): number => {
      const childRanks = (childrenByParent.get(row.id) ?? []).map(rollup);
      const rank = childRanks.length
        ? Math.max(JOURNEY_RANK[row.journeyStage], ...childRanks)
        : JOURNEY_RANK[row.journeyStage];

      row.journeyStage = JOURNEY_BY_RANK[rank];

      return rank;
    };

    results.filter((row) => !row.parentId).forEach(rollup);

    return results;
  }, [baseRows, findingsByNode, nodesById, processingStateByTreeNodeId, referenceModelRoot.treeNodeId]);

  const rowsById = useMemo(() => new Map(allRows.map((row) => [row.id, row])), [allRows]);
  const expandableIds = useMemo(() => allRows.filter((row) => row.hasChildren).map((row) => row.id), [allRows]);
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set());
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;

    initialized.current = true;

    void getExpandedByCollapseKey().then((saved) => {
      setExpanded(
        new Set(
          allRows
            .filter((row) => row.hasChildren && (!row.collapseKey || saved[row.collapseKey]))
            .map((row) => row.id),
        ),
      );
    });
  }, [allRows]);

  const visibleRows = useMemo(
    () => allRows.filter((row) => isVisible(row, expanded, rowsById)),
    [allRows, expanded, rowsById],
  );

  function descendantIds(rowId: string): string[] {
    const ids: string[] = [];

    const visit = (parentId: string): void => {
      allRows
        .filter((row) => row.parentId === parentId && row.hasChildren)
        .forEach((row) => {
          ids.push(row.id);
          visit(row.id);
        });
    };

    visit(rowId);

    return ids;
  }

  function toggle(row: AuditorTreeRow, modifiers?: ToggleModifiers): void {
    if (!row.hasChildren) return;

    const opening = !expanded.has(row.id);

    setExpanded((current) => {
      const next = new Set(current);
      const targets = modifiers?.shiftKey
        ? [row.id, ...descendantIds(row.id)]
        : modifiers?.ctrlKey || modifiers?.metaKey
          ? allRows
              .filter((candidate) => candidate.hasChildren && candidate.collapseKey === row.collapseKey)
              .map((candidate) => candidate.id)
          : [row.id];

      targets.forEach((id) => (opening ? next.add(id) : next.delete(id)));

      return next;
    });

    if (row.collapseKey) void setExpandedStateForCollapseKey(row.collapseKey, opening);
  }

  function navigate(row: AuditorTreeRow): void {
    if (row.sitecoreUrl) window.open(row.sitecoreUrl, "_blank", "noopener,noreferrer");
  }

  const columnDefs = useMemo<ColDef<AuditorTreeRow>[]>(
    () => [
      { field: "status", headerName: "", width: 42, minWidth: 42, maxWidth: 42, cellRenderer: AuditorStatusCell },
      {
        field: "journeyStage",
        headerName: "",
        width: 58,
        minWidth: 58,
        maxWidth: 58,
        cellRenderer: (params: ICellRendererParams<AuditorTreeRow>) =>
          params.data?.isSitecoreItem ? <JourneyCell stage={params.data.journeyStage} /> : null,
      },
      {
        headerName: "",
        width: 36,
        minWidth: 36,
        maxWidth: 36,
        cellClass: "fobles-auditor-navigate-cell",
        cellRenderer: (params: ICellRendererParams<AuditorTreeRow>) =>
          params.data?.sitecoreUrl && params.data.isSitecoreItem ? (
            <button
              type="button"
              className="fobles-auditor-navigate"
              title="Navigate to item in a new tab"
              aria-label="Navigate to item in a new tab"
              onClick={(event) => {
                event.stopPropagation();
                navigate(params.data!);
              }}
            >
              ◎
            </button>
          ) : null,
      },
      {
        field: "label",
        headerName: "Item / Relationship",
        flex: 2,
        minWidth: 320,
        // Not selectable on purpose: text worth copying lives in the details panels. Selectable cells are what let a
        // double-click select a word and raise the browser's selection toolbar.
        cellClass: (params) => (params.data?.hasChildren ? "fobles-auditor-expandable-cell" : undefined),
        cellRenderer: (params: ICellRendererParams<AuditorTreeRow>) => {
          const row = params.data;

          if (!row) return null;

          const opened = expanded.has(row.id);

          return (
            <div
              className={`fobles-auditor-tree-row fobles-auditor-tree-row--${row.kind}${row.isSitecoreItem ? " fobles-auditor-tree-row--item" : ""}`}
              style={{ paddingLeft: row.depth * 24 }}
            >
              {row.hasChildren ? (
                <button
                  type="button"
                  className="fobles-auditor-tree-toggle"
                  onClick={(event) => {
                    event.stopPropagation();
                    toggle(row, event);
                  }}
                >
                  <img src={opened ? EXPANDED_GLYPH : COLLAPSED_GLYPH} alt="" />
                </button>
              ) : (
                <span className="fobles-auditor-tree-spacer" />
              )}
              {row.icon ? <img className="fobles-auditor-tree-icon" src={row.icon} alt="" /> : null}
              <span className="fobles-auditor-tree-label">{row.label}</span>
            </div>
          );
        },
      },
      { field: "path", headerName: "Path", flex: 2, minWidth: 360 },
      {
        headerName: "Actions",
        width: 120,
        minWidth: 120,
        maxWidth: 120,
        cellRenderer: (params: ICellRendererParams<AuditorTreeRow>) =>
          params.data?.kind === "finding" && params.data.finding ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onViewTestDetails(params.data!.finding!);
              }}
            >
              Test Details
            </button>
          ) : params.data?.referenceModelNodeId ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onViewData(params.data!.referenceModelNodeId!);
              }}
            >
              View Data
            </button>
          ) : null,
      },
    ],
    [allRows, expanded, onViewData, onViewTestDetails],
  );

  function handleRowDoubleClick(event: RowDoubleClickedEvent<AuditorTreeRow>): void {
    const target = event.event?.target;

    if (target instanceof Element && target.closest("button, a, input, select, textarea")) return;
    if (!event.data) return;

    toggle(event.data, event.event instanceof MouseEvent ? event.event : undefined);
    clearTextSelection(event.event);
  }

  return (
    <div className="fobles-auditor-grid-shell">
      <div className="fobles-auditor-tree-actions">
        <button type="button" onClick={() => setExpanded(new Set(expandableIds))}>Expand All</button>
        <button type="button" onClick={() => setExpanded(new Set())}>Collapse All</button>
      </div>

      <div
        className="fobles-auditor-grid"
        style={{ userSelect: "none" }}
        onMouseDown={blockDoubleClickTextSelection}
      >
        <AgGridReact<AuditorTreeRow>
          theme={themeQuartz}
          rowData={visibleRows}
          columnDefs={columnDefs}
          getRowId={(params) => params.data.id}
          getRowClass={(params) =>
            params.data?.isSitecoreItem
              ? "fobles-auditor-grid-row--item"
              : params.data?.kind === "finding"
                ? "fobles-auditor-grid-row--finding"
                : "fobles-auditor-grid-row--relationship"
          }
          defaultColDef={{ resizable: true }}
          ensureDomOrder
          onRowDoubleClicked={handleRowDoubleClick}
          animateRows={false}
        />
      </div>
    </div>
  );
}
