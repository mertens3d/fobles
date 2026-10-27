// @source-path [fobles] src/content/features/auditor/components/auditor-dialog.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { AUDIT_CHECK } from "../../../../constants/audit-checks.const";
import { showFoblesCleanupDialog } from "../../../../shared/error-dialog";
import { getReferenceGraphFilters } from "../../../../shared/reference-graph-settings";
import { extensionLog } from "../../../logger";
import { logHeapSnapshot } from "../../../foundation/diagnostics/heap-snapshot";
import type { SitecoreHarvestFiltersState } from "../../../foundation/harvesting/sitecore-harvester.types";
import {
  getFoblesDataSession,
  subscribeFoblesAcquisitionProgress,
  type FoblesAcquisitionProgress,
} from "../../../foundation/reference-data/reference-data-service";
import { createDialogCloseButton } from "../../../shared/dialog/dialog-close-button";
import { DialogIconButton } from "../../../shared/ui/dialog/dialog-icon-button";
import type { PhaseProgress } from "../../../foundation/reference-data/progress/lifecycle.types";
import { LifecycleProgressFooter } from "../../../shared/ui/reference-controls/lifecycle-progress-footer";
import { ReferenceModelViewer } from "../../../shared/ui/reference-model/reference-model-viewer";
import { NodeDetailsPanel } from "../../reference-graph/components/node-details-panel";
import { getGraphPresentationState } from "../../../foundation/reference-data/model/graph-presentation-state";
import type { AuditFinding, AuditFindingStatus } from "../audit-finding.types";
import type { AuditFindingStore } from "../audit-finding-store";
import {
  getAuditorCheckFilter,
  getAuditorGraphFilters,
  getAuditorStatusFilter,
  setAuditorCheckFilter,
  setAuditorGraphFilters,
  setAuditorStatusFilter,
} from "../auditor-ui-settings";
import { interpretResolveState } from "../checks/reference-resolved-check";
import { downloadAuditFindingsCsv } from "../export/audit-csv-exporter";
import { AuditorGrid } from "./auditor-grid";
import { AuditorSummary } from "./auditor-summary";
import { AuditorToolbar } from "./auditor-toolbar";
export const AUDITOR_DIALOG_ID = "fobles-auditor-dialog";
const ALL_STATUSES: readonly AuditFindingStatus[] = ["pending", "passed", "warning", "error"];
const DATA_SESSION_POLL_INTERVAL_MS = 100;
const DEFAULT_GRAPH_FILTERS: SitecoreHarvestFiltersState = {
  parent: false,
  children: false,
  layouts: true,
  referrers: false,
  customFields: false,
  standardFields: false,
  template: false,
};
type AuditorAppProps = {
  doc: Document;
  findingStore: AuditFindingStore;
  workSessionId: string;
};
type FoblesDataSessionHandle = ReturnType<typeof getFoblesDataSession>;
// AI NOTE: The Auditor dialog opens while the audit run is still acquiring the Reference Model, so the Data
// AI NOTE: Service session does not exist yet at mount. Wait for it instead of subscribing once and giving up.
function useFoblesDataSessionWhenReady(workSessionId: string): FoblesDataSessionHandle {
  const [session, setSession] = useState<FoblesDataSessionHandle>(() => getFoblesDataSession(workSessionId));
  useEffect(() => {
    let active = true;
    const startedAt = performance.now();
    function attach(): boolean {
      const found = getFoblesDataSession(workSessionId);
      if (!found || !active) return false;
      extensionLog.debug("Auditor dialog: data session attached", {
        workSessionId,
        waitedMs: Math.round(performance.now() - startedAt),
      });
      setSession(found);
      return true;
    }
    if (attach()) {
      return () => {
        active = false;
      };
    }
    const timer = window.setInterval(() => {
      if (attach()) window.clearInterval(timer);
    }, DATA_SESSION_POLL_INTERVAL_MS);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [workSessionId]);
  return session;
}
function AuditorApp({ doc, findingStore, workSessionId }: AuditorAppProps) {
  const [snapshot, setSnapshot] = useState<readonly AuditFinding[]>(() => findingStore.getSnapshot());
  const [query, setQuery] = useState("");
  const [modelRevision, setModelRevision] = useState(0);
  const [harvestProgress, setHarvestProgress] = useState<PhaseProgress>();
  const [acquisitionProgress, setAcquisitionProgress] = useState<FoblesAcquisitionProgress>();
  const [liveResolveProgress, setLiveResolveProgress] = useState<PhaseProgress>();
  const [selectedStatuses, setSelectedStatuses] = useState<ReadonlySet<AuditFindingStatus>>(() => new Set(ALL_STATUSES));
  const [selectedChecks, setSelectedChecks] = useState<ReadonlySet<string>>(() => new Set());
  const [graphFilters, setGraphFilters] = useState<SitecoreHarvestFiltersState>(DEFAULT_GRAPH_FILTERS);
  const [filtersLoaded, setFiltersLoaded] = useState(false);
  const [viewReferenceModel, setViewReferenceModel] = useState(false);
  const [selectedTreeNodeId, setSelectedTreeNodeId] = useState<string>();
  const [selectedTestFinding, setSelectedTestFinding] = useState<AuditFinding>();
  const [showHelp, setShowHelp] = useState(false);
  const startedAt = useRef(performance.now());
  const completedElapsedSeconds = useRef<number | undefined>(undefined);
  const dataSession = useFoblesDataSessionWhenReady(workSessionId);
  const data = dataSession?.data;
  const model = data?.model;
  useEffect(() => findingStore.subscribe(setSnapshot), [findingStore]);
  // AI NOTE: A cold item runs a live harvest before any data session exists. Subscribe by work-session id up front so
  // AI NOTE: that harvest's progress is visible instead of an empty dialog.
  useEffect(
    () => subscribeFoblesAcquisitionProgress(workSessionId, (progress) => {
      extensionLog.debug("Auditor dialog: acquisition progress received", { workSessionId, progress });
      setAcquisitionProgress(progress);
    }),
    [workSessionId],
  );
  // AI NOTE: Persisting is gated on filtersLoaded so the initial defaults never overwrite the stored values.
  // AI NOTE: Graph filters fall back to the Graph's stored filters until the Auditor has its own stored set.
  useEffect(() => {
    let active = true;
    void Promise.all([getAuditorStatusFilter(), getAuditorCheckFilter(), getAuditorGraphFilters(), getReferenceGraphFilters()]).then(
      ([storedStatuses, storedChecks, storedGraphFilters, referenceGraphFilters]) => {
        if (!active) return;
        if (storedStatuses) setSelectedStatuses(new Set(ALL_STATUSES.filter((status) => storedStatuses.includes(status))));
        if (storedChecks) setSelectedChecks(new Set(storedChecks));
        setGraphFilters({ ...referenceGraphFilters, ...storedGraphFilters });
        setFiltersLoaded(true);
      },
    );
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (filtersLoaded) void setAuditorStatusFilter(Array.from(selectedStatuses));
  }, [filtersLoaded, selectedStatuses]);
  useEffect(() => {
    if (filtersLoaded) void setAuditorCheckFilter(Array.from(selectedChecks));
  }, [filtersLoaded, selectedChecks]);
  useEffect(() => {
    if (filtersLoaded) void setAuditorGraphFilters(graphFilters);
  }, [filtersLoaded, graphFilters]);
  useEffect(() => {
    if (!dataSession) return;
    const unsubscribeChange = dataSession.subscribeChange(() => {
      setModelRevision((current) => current + 1);
    });
    const unsubscribeHarvest = dataSession.subscribeHarvestProgress((progress) => {
      extensionLog.debug("Auditor dialog: harvest progress received", { workSessionId, progress });
      setHarvestProgress(progress);
    });
    const unsubscribeProcessing = dataSession.subscribeProcessingProgress((progress) => {
      extensionLog.debug("Auditor dialog: processing progress received", {
        workSessionId,
        completedItemCount: progress.completedItemCount,
        maxItemCount: progress.maxItemCount,
        status: progress.status,
      });
      setLiveResolveProgress({
        completed: progress.completedItemCount,
        max: progress.maxItemCount,
        status: progress.status,
      });
    });
    return () => {
      unsubscribeChange();
      unsubscribeHarvest();
      unsubscribeProcessing();
    };
  }, [dataSession, workSessionId]);
  // AI NOTE: Fallback that needs no event replay: count unique item GUIDs whose every Resolve candidate node
  // AI NOTE: has reached a terminal processing state, the same unit Graph's Resolving bar counts.
  const derivedResolveProgress = useMemo<PhaseProgress | undefined>(() => {
    if (!data || !model) return undefined;
    const treeNodeIdsByGuid = new Map<string, string[]>();
    data.resolveCandidateTreeNodeIds.forEach((treeNodeId) => {
      const node = model.nodesById.get(treeNodeId);
      const guid = (node?.nodeType === "item" ? node.scItem.scItemId || treeNodeId : treeNodeId).toLowerCase();
      const treeNodeIds = treeNodeIdsByGuid.get(guid) ?? [];
      treeNodeIds.push(treeNodeId);
      treeNodeIdsByGuid.set(guid, treeNodeIds);
    });
    let completed = 0;
    treeNodeIdsByGuid.forEach((treeNodeIds) => {
      const terminal = treeNodeIds.every((treeNodeId) => {
        const status = model.processingStateByTreeNodeId.get(treeNodeId);
        return status !== undefined && status !== "pending" && status !== "enriching";
      });
      if (terminal) completed += 1;
    });
    const max = treeNodeIdsByGuid.size;
    return { completed, max, status: completed >= max ? "complete" : "running" };
  }, [data, model, modelRevision]);
  const resolveProgress = liveResolveProgress ?? derivedResolveProgress;
  if (resolveProgress?.status === "complete" && completedElapsedSeconds.current === undefined) {
    completedElapsedSeconds.current = (performance.now() - startedAt.current) / 1000;
  }
  const resolveComplete = resolveProgress?.status === "complete";
  useEffect(() => {
    logHeapSnapshot("auditor-opened", { workSessionId });
  }, [workSessionId]);
  useEffect(() => {
    if (resolveComplete) logHeapSnapshot("auditor-resolve-complete", { workSessionId });
  }, [resolveComplete, workSessionId]);
  const projectedFindings = useMemo(() => {
    const nodesById = model?.nodesById;
    return snapshot.map((finding) => {
      const node = finding.referenceModelNodeId ? nodesById?.get(finding.referenceModelNodeId) : undefined;
      if (!node) return finding;
      const presentation = getGraphPresentationState(node);
      const processingStatus = model?.processingStateByTreeNodeId.get(node.treeNodeId);
      const liveResolve = finding.checkKey === AUDIT_CHECK.REFERENCE_RESOLVED.KEY
        ? interpretResolveState(processingStatus)
        : undefined;
      return {
        ...finding,
        dataType: presentation.kind,
        status: liveResolve?.status ?? finding.status,
        summary: liveResolve?.summary ?? finding.summary,
      };
    });
  }, [snapshot, model, modelRevision]);
  const filterableFindings = useMemo(() => {
    const nodesById = model?.nodesById;
    const normalizedQuery = query.trim().toLowerCase();
    const anyGraphFilterEnabled = Object.values(graphFilters).some(Boolean);
    return projectedFindings.filter((finding) => {
      if (selectedChecks.size > 0 && !selectedChecks.has(finding.checkKey)) return false;
      const node = finding.referenceModelNodeId ? nodesById?.get(finding.referenceModelNodeId) : undefined;
      const branch = node ? getGraphPresentationState(node).branch : undefined;
      if (anyGraphFilterEnabled && branch && !graphFilters[branch]) return false;
      if (!normalizedQuery) return true;
      const searchable = [
        finding.dataType,
        finding.itemId,
        finding.itemName,
        finding.itemPath,
        finding.checkLabel,
        finding.context,
        finding.summary,
        finding.details,
      ]
        .filter((value): value is string => Boolean(value))
        .join("\n")
        .toLowerCase();
      return searchable.includes(normalizedQuery);
    });
  }, [projectedFindings, selectedChecks, query, graphFilters, model]);
  const visibleFindings = useMemo(
    () => filterableFindings.filter((finding) => selectedStatuses.has(finding.status)),
    [filterableFindings, selectedStatuses],
  );
  const summary = useMemo(() => {
    const counts = { pending: 0, passed: 0, warning: 0, error: 0, total: filterableFindings.length };
    filterableFindings.forEach((finding) => {
      counts[finding.status] += 1;
    });
    return counts;
  }, [filterableFindings]);
  function toggleStatus(status: AuditFindingStatus): void {
    setSelectedStatuses((current) => {
      const next = new Set(current);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
  }
  function toggleCheck(checkKey: string): void {
    setSelectedChecks((current) => {
      const next = new Set(current);
      if (next.has(checkKey)) next.delete(checkKey);
      else next.add(checkKey);
      return next;
    });
  }
  function resetFilters(): void {
    setQuery("");
    setSelectedStatuses(new Set(ALL_STATUSES));
    setSelectedChecks(new Set());
  }
  function exportCsv(): void {
    downloadAuditFindingsCsv(doc, visibleFindings, `fobles-auditor-findings-${Date.now()}.csv`);
  }
  return (
    <div className="fobles-auditor-app">
      <AuditorSummary
        counts={summary}
        selectedStatuses={selectedStatuses}
        onToggleStatus={toggleStatus}
      />
      <AuditorToolbar
        selectedChecks={selectedChecks}
        onToggleCheck={toggleCheck}
        onReset={resetFilters}
        onExport={exportCsv}
        graphFilters={graphFilters}
        onGraphFilterChange={(key, checked) => {
          setGraphFilters((current) => ({ ...current, [key]: checked }));
        }}
        onClearGraphFilters={() => {
          setGraphFilters(
            (current) =>
              Object.fromEntries(
                Object.keys(current).map((key) => [key, false]),
              ) as unknown as SitecoreHarvestFiltersState,
          );
        }}
        onViewReferenceModel={() => setViewReferenceModel(true)}
        onHelp={() => setShowHelp(true)}
        footer={
          <LifecycleProgressFooter
            harvestProgress={harvestProgress ?? (acquisitionProgress?.harvestRequired ? acquisitionProgress.progress : undefined)}
            resolveProgress={resolveProgress}
            elapsedSeconds={completedElapsedSeconds.current}
            buildingLabel="Building audit"
          />
        }
      />
      {viewReferenceModel && model ? (
        <ReferenceModelViewer
          referenceModel={model.referenceModel}
          onClose={() => setViewReferenceModel(false)}
        />
      ) : null}
      <div className="fobles-auditor-search-row">
        <input
          type="search"
          className="fobles-filter-search"
          placeholder="Search..."
          aria-label="Search audit results"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>
      <div className="fobles-auditor-workspace">
        <div className="fobles-auditor-workspace-main">
          {model ? (
            <AuditorGrid
              referenceModelRoot={model.referenceModel}
              findings={visibleFindings}
              processingStateByTreeNodeId={model.processingStateByTreeNodeId}
              onViewData={setSelectedTreeNodeId}
              onViewTestDetails={setSelectedTestFinding}
            />
          ) : null}
        </div>
        {selectedTreeNodeId && model ? (
          <aside className="fobles-auditor-workspace-details">
            <NodeDetailsPanel
              selectedTreeNodeId={selectedTreeNodeId}
              nodesById={model.nodesById}
              processingStateByTreeNodeId={model.processingStateByTreeNodeId}
              onClose={() => setSelectedTreeNodeId(undefined)}
            />
          </aside>
        ) : null}
      </div>
      {selectedTestFinding ? (
        <div
          className="fobles-auditor-test-details-backdrop"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) setSelectedTestFinding(undefined);
          }}
        >
          <section
            className="fobles-auditor-test-details"
            role="dialog"
            aria-modal="true"
            aria-label="Audit test details"
          >
            <DialogIconButton
              kind="close"
              label="Close test details"
              onClick={() => setSelectedTestFinding(undefined)}
            />
            <h2>{selectedTestFinding.checkLabel}</h2>
            <dl>
              <div><dt>Status</dt><dd>{selectedTestFinding.status}</dd></div>
              <div><dt>Summary</dt><dd>{selectedTestFinding.summary}</dd></div>
              {selectedTestFinding.details ? <div><dt>Details</dt><dd>{selectedTestFinding.details}</dd></div> : null}
              {selectedTestFinding.context ? <div><dt>Context</dt><dd>{selectedTestFinding.context}</dd></div> : null}
              {selectedTestFinding.itemPath ? <div><dt>Path</dt><dd>{selectedTestFinding.itemPath}</dd></div> : null}
            </dl>
          </section>
        </div>
      ) : null}
      {showHelp ? (
        <div
          className="fobles-auditor-help-backdrop"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) setShowHelp(false);
          }}
        >
          <section className="fobles-auditor-help" role="dialog" aria-modal="true" aria-label="Auditor help">
            <header className="fobles-auditor-help-header">
              <h2>Fobles Auditor</h2>
              <DialogIconButton
                kind="close"
                label="Close Auditor help"
                onClick={() => setShowHelp(false)}
              />
            </header>
            <div className="fobles-auditor-help-body">
              <p>Inspect the Reference Model as a Sitecore-style tree with tests attached to the exact item or relationship they evaluate.</p>
              <h3>Tree shortcuts</h3>
              <dl className="fobles-auditor-help-list">
                <div><dt>Click glyph</dt><dd>Expand or collapse one node.</dd></div>
                <div><dt>Double-click row</dt><dd>Expand or collapse that row.</dd></div>
                <div><dt>Ctrl/Cmd + double-click row</dt><dd>Apply the same state to every node in that semantic category.</dd></div>
                <div><dt>Shift + click</dt><dd>Expand or collapse the selected subtree.</dd></div>
                <div><dt>View Data</dt><dd>Open a right-side details panel without resizing the audit table.</dd></div>
                <div><dt>Test Details</dt><dd>Open the full result for one audit test.</dd></div>
              </dl>
              <h3>Data journey</h3>
              <ul className="fobles-auditor-help-key">
                <li>
                  <span className="fobles-auditor-journey fobles-auditor-journey--referenced"><span className="is-complete" /><span /><span /><span /></span>
                  <span><strong>Referenced</strong> Discovered from the target or another relationship.</span>
                </li>
                <li>
                  <span className="fobles-auditor-journey fobles-auditor-journey--cached"><span className="is-complete" /><span className="is-complete" /><span /><span /></span>
                  <span><strong>Cached</strong> Facts were supplied by the Sitecore data cache.</span>
                </li>
                <li>
                  <span className="fobles-auditor-journey fobles-auditor-journey--live"><span className="is-complete" /><span className="is-complete" /><span className="is-complete" /><span /></span>
                  <span><strong>Live</strong> Sitecore was queried during this operation.</span>
                </li>
                <li>
                  <span className="fobles-auditor-journey fobles-auditor-journey--tested"><span className="is-complete" /><span className="is-complete" /><span className="is-complete" /><span className="is-complete" /></span>
                  <span><strong>Tested</strong> Audit checks completed for the node.</span>
                </li>
              </ul>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
export function openAuditorDialog(
  doc: Document,
  findingStore: AuditFindingStore,
  workSessionId: string,
  onCancelRequested: () => Promise<void>,
): Promise<void> {
  doc.getElementById(AUDITOR_DIALOG_ID)?.remove();
  return new Promise<void>((resolve) => {
    const dialog = doc.createElement("dialog");
    dialog.id = AUDITOR_DIALOG_ID;
    dialog.className = "fobles-auditor-dialog";
    const closeButton = createDialogCloseButton(doc, dialog);
    const appHost = doc.createElement("div");
    appHost.style.cssText = "position:relative;width:100%;height:100%;";
    const appRoot = createRoot(appHost);
    dialog.append(closeButton, appHost);
    doc.body.appendChild(dialog);
    dialog.addEventListener(
      "close",
      () => {
        void (async () => {
          logHeapSnapshot("auditor-closing", { workSessionId });
          const cleanupDialog = showFoblesCleanupDialog(doc);
          try {
            await onCancelRequested();
          } finally {
            if (cleanupDialog.isConnected) cleanupDialog.close();
            appRoot.unmount();
            dialog.remove();
            logHeapSnapshot("auditor-closed", { workSessionId });
            window.setTimeout(() => logHeapSnapshot("auditor-closed+10s", { workSessionId }), 10000);
            resolve();
          }
        })();
      },
      { once: true },
    );
    dialog.showModal();
    appRoot.render(
      <AuditorApp
        doc={doc}
        findingStore={findingStore}
        workSessionId={workSessionId}
      />,
    );
  });
}
