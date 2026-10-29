// @source-path [fobles] src/content/features/auditor/components/auditor-grid.tsx

import { useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import { AgGridReact } from "ag-grid-react";
import { AllCommunityModule, ModuleRegistry, themeQuartz, type ColDef, type ICellRendererParams, type RowDoubleClickedEvent } from "ag-grid-community";
import type { ReferenceModelNode } from "../../../foundation/reference-data/model/reference-model.types";
import type { ProcessingStateByTreeNodeId } from "../../../foundation/reference-data/processing/processing-state";
import { getExpandedByCollapseKey, setExpandedStateForCollapseKey } from "../../reference-graph/graph-nodes/graph-collapse-settings";
import type { AuditFinding } from "../audit-finding.types";
import { descendantExpandableIds, isAuditorRowVisible, reconcileExpandedRows } from "../auditor-grid/auditor-expansion-state";
import { projectAuditorRows } from "../auditor-grid/auditor-row-projector";
import type { AuditorTreeRow, ToggleModifiers } from "../auditor-grid/auditor-grid.types";
import { AuditorDataAction } from "./auditor-data-action";
import { AuditorJourneyCell } from "./auditor-journey-cell";
import { AuditorStatusCell } from "./auditor-status-cell";
import { AuditorTreeCell } from "./auditor-tree-cell";

ModuleRegistry.registerModules([AllCommunityModule]);

export type AuditorGridProps = {
  referenceModelRoot: ReferenceModelNode;
  findings: readonly AuditFinding[];
  processingStateByTreeNodeId: ProcessingStateByTreeNodeId;
  modelRevision: number;
  onViewData: (treeNodeId: string) => void;
  onViewTestDetails: (findings: readonly AuditFinding[]) => void;
};

function blockDoubleClickTextSelection(event: ReactMouseEvent<HTMLDivElement>): void {
  if (event.detail > 1) event.preventDefault();
}

function clearTextSelection(source: Event | null | undefined): void {
  const target = source?.target;
  const targetDocument = target instanceof Node ? target.ownerDocument ?? document : document;
  targetDocument.getSelection()?.removeAllRanges();
}

export function AuditorGrid({ referenceModelRoot, findings, processingStateByTreeNodeId, modelRevision, onViewData, onViewTestDetails }: AuditorGridProps) {
  const liveSeen = useRef(new Set<string>());

  processingStateByTreeNodeId.forEach((status, treeNodeId) => {
    if (status === "enriched" || status === "not-found" || status === "failed") liveSeen.current.add(treeNodeId);
  });

  const allRows = useMemo(
    () => projectAuditorRows(referenceModelRoot, findings, processingStateByTreeNodeId, liveSeen.current),
    [referenceModelRoot, findings, processingStateByTreeNodeId, modelRevision],
  );
  const rowsById = useMemo(() => new Map(allRows.map((row) => [row.id, row])), [allRows]);
  const expandableIds = useMemo(() => allRows.filter((row) => row.hasChildren).map((row) => row.id), [allRows]);
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set());
  const [query, setQuery] = useState("");
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;

    initialized.current = true;

    void getExpandedByCollapseKey().then((saved) => {
      setExpanded(new Set(allRows.filter((row) => row.hasChildren && (!row.collapseKey || saved[row.collapseKey])).map((row) => row.id)));
    });
  }, [allRows]);

  useEffect(() => {
    setExpanded((current) => reconcileExpandedRows(current, allRows, rowsById));
  }, [allRows, rowsById]);

  const searchedRowIds = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return undefined;

    const matchingIds = new Set<string>();

    allRows.forEach((row) => {
      if (!row.searchText.includes(normalizedQuery)) return;

      let current: AuditorTreeRow | undefined = row;
      while (current) {
        matchingIds.add(current.id);
        current = current.parentId ? rowsById.get(current.parentId) : undefined;
      }
    });

    return matchingIds;
  }, [allRows, query, rowsById]);
  const visibleRows = useMemo(
    () => allRows.filter((row) => searchedRowIds ? searchedRowIds.has(row.id) : isAuditorRowVisible(row, expanded, rowsById)),
    [allRows, expanded, rowsById, searchedRowIds],
  );
  const structureKey = useMemo(() => allRows.map((row) => `${row.id}:${row.parentId ?? ""}`).join("|"), [allRows]);

  function toggle(row: AuditorTreeRow, modifiers?: ToggleModifiers): void {
    if (!row.hasChildren) return;

    const opening = !expanded.has(row.id);

    setExpanded((current) => {
      const next = new Set(current);
      const targets = modifiers?.shiftKey
        ? [row.id, ...descendantExpandableIds(row.id, allRows)]
        : modifiers?.ctrlKey || modifiers?.metaKey
          ? allRows.filter((candidate) => candidate.hasChildren && candidate.collapseKey === row.collapseKey).map((candidate) => candidate.id)
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
      { field: "status", headerName: "", width: 30, minWidth: 30, maxWidth: 30, cellRenderer: AuditorStatusCell },
      {
        field: "journeyStage",
        headerName: "",
        width: 42,
        minWidth: 42,
        maxWidth: 42,
        cellRenderer: (params: ICellRendererParams<AuditorTreeRow>) => params.data?.isSitecoreItem ? <AuditorJourneyCell stage={params.data.journeyStage} /> : null,
      },
      {
        headerName: "",
        width: 20,
        minWidth: 20,
        maxWidth: 20,
        cellClass: "fobles-auditor-navigate-cell",
        cellRenderer: (params: ICellRendererParams<AuditorTreeRow>) => params.data?.sitecoreUrl && params.data.isSitecoreItem ? (
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
        flex: 1,
        minWidth: 320,
        cellClass: (params) => params.data?.hasChildren ? "fobles-auditor-expandable-cell" : undefined,
        cellRenderer: (params: ICellRendererParams<AuditorTreeRow>) => params.data
          ? <AuditorTreeCell row={params.data} opened={expanded.has(params.data.id)} onToggle={toggle} />
          : null,
      },
      {
        headerName: "",
        width: 32,
        minWidth: 32,
        maxWidth: 32,
        cellClass: "fobles-auditor-data-action-cell",
        cellRenderer: (params: ICellRendererParams<AuditorTreeRow>) => params.data?.referenceModelNodeId
          ? <AuditorDataAction onClick={() => onViewData(params.data!.referenceModelNodeId!)} />
          : null,
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
      <div className="fobles-auditor-grid-toolbar">
        <input
          type="search"
          className="fobles-auditor-grid-search"
          placeholder="Search..."
          aria-label="Search Auditor tree"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <div className="fobles-auditor-tree-actions">
          <button type="button" onClick={() => setExpanded(new Set(expandableIds))}>Expand All</button>
          <button type="button" onClick={() => setExpanded(new Set())}>Collapse All</button>
        </div>
      </div>
      <div className="fobles-auditor-grid" onMouseDown={blockDoubleClickTextSelection}>
        <AgGridReact<AuditorTreeRow>
          key={structureKey}
          context={{ onViewTestDetails }}
          theme={themeQuartz}
          rowData={visibleRows}
          columnDefs={columnDefs}
          getRowId={(params) => params.data.id}
          getRowClass={(params) => params.data?.isSitecoreItem ? "fobles-auditor-grid-row--item" : "fobles-auditor-grid-row--relationship"}
          defaultColDef={{ resizable: false, sortable: false }}
          headerHeight={0}
          rowHeight={26}
          ensureDomOrder
          onRowDoubleClicked={handleRowDoubleClick}
          animateRows={false}
        />
      </div>
    </div>
  );
}
