import type { FoblesDataOperationHandle } from "./auditor-app.types.js";
// @source-path [fobles] src/content/features/auditor/components/auditor-app/auditor-app.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { AUDIT_CHECK } from "../../../../../constants/audit-checks.const";
import { getReferenceGraphFilters } from "../../../../../shared/reference-graph-settings";
import { extensionLog } from "../../../../logger";
import { logHeapSnapshot } from "../../../../foundation/diagnostics/heap-snapshot";
import type { SitecoreHarvestFiltersState } from "../../../../../constants/_base/_base.types";
import type { PhaseProgress } from "../../../../foundation/reference-data/progress/lifecycle.types";
import { LifecycleProgressFooter } from "../../../../shared/ui/reference-controls/lifecycle-progress-footer";
import { ReferenceModelViewer } from "../../../../shared/ui/reference-model/reference-model-viewer";
import { getGraphPresentationState } from "../../../../foundation/reference-data/model/graph-presentation-state";
import type { AuditFinding } from "../../auditor.types";
import type { AuditFindingStatus } from "../../auditor.types";
import type { AuditFindingStore } from "../../auditor.types";
import {
  getAuditorCheckFilter,
  getAuditorGraphFilters,
  getAuditorStatusFilter,
  setAuditorCheckFilter,
  setAuditorGraphFilters,
  setAuditorStatusFilter,
} from "../../auditor-ui-settings";
import { interpretResolveState } from "../../checks/reference-resolved-check";
import { downloadAuditFindingsCsv } from "../../export/audit-csv-exporter";
import { AuditorGrid } from "../auditor-grid/auditor-grid";
import type { AuditorTestDetailsSelection } from "../../auditor-grid/auditor-grid.types.ts";
import { AuditorHelpDialog } from "../auditor-help-dialog/auditor-help-dialog";
import { AuditorTestDetailsDialog } from "../auditor-test-details-dialog/auditor-test-details-dialog";
import { AuditorSummary } from "../auditor-summary/auditor-summary";
import { AuditorToolbar } from "../auditor-toolbar/auditor-toolbar";
import { NodeDetailsPanel } from "../../../../shared/ui/details/node-details-panel";
import { FoblesDetailsWindow } from "../../../../shared/dialog/fobles-details-window";
import { getFoblesDataSession, subscribeFoblesAcquisitionProgress } from "../../../../foundation/reference-data/reference-data-service.ts";
import type { FoblesAcquisitionProgress } from "../../../../foundation/reference-data/reference-data.types.ts";
const ALL_STATUSES: readonly AuditFindingStatus[] = ["pending", "passed", "warning", "error"];
const DATA_OPERATION_POLL_INTERVAL_MS = 100;
const DEFAULT_GRAPH_FILTERS: SitecoreHarvestFiltersState = {
  parent: false,
  children: false,
  layouts: true,
  referrers: false,
  customFields: false,
  standardFields: false,
  template: false,
};

export type AuditorAppProps = { doc: Document; findingStore: AuditFindingStore; workOperationId: string };

// AI NOTE: The Auditor dialog opens while the audit run is still acquiring the Reference Model, so the Data
// AI NOTE: Service operation does not exist yet at mount. Wait for it instead of subscribing once and giving up.
function useFoblesDataOperationWhenReady(workOperationId: string): FoblesDataOperationHandle {
  const [operation, setOperation] = useState<FoblesDataOperationHandle>(() => getFoblesDataSession(workOperationId));
  useEffect(() => {
    let active = true;
    const startedAt = performance.now();
    function attach(): boolean {
      const found = getFoblesDataSession(workOperationId);
      if (!found || !active) {
        return false;
      }
      extensionLog.debug("Auditor dialog: data operation attached", {
        workOperationId,
        waitedMs: Math.round(performance.now() - startedAt),
      });
      setOperation(found);
      return true;
    }
    if (attach()) {
      return () => {
        active = false;
      };
    }
    const timer = window.setInterval(() => {
      if (attach()) {
        window.clearInterval(timer);
      }
    }, DATA_OPERATION_POLL_INTERVAL_MS);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [workOperationId]);
  return operation;
}

export function AuditorApp({ doc, findingStore, workOperationId }: AuditorAppProps) {
  const [snapshot, setSnapshot] = useState<readonly AuditFinding[]>(() => findingStore.getSnapshot());
  const [query, setQuery] = useState("");
  const [modelRevision, setModelRevision] = useState(0);
  const [harvestProgress, setHarvestProgress] = useState<PhaseProgress>();
  const [acquisitionProgress, setAcquisitionProgress] = useState<FoblesAcquisitionProgress>();
  const [liveResolveProgress, setLiveResolveProgress] = useState<PhaseProgress>();
  const [selectedStatuses, setSelectedStatuses] = useState<ReadonlySet<AuditFindingStatus>>(
    () => new Set(ALL_STATUSES),
  );
  const [selectedChecks, setSelectedChecks] = useState<ReadonlySet<string>>(() => new Set());
  const [graphFilters, setGraphFilters] = useState<SitecoreHarvestFiltersState>(DEFAULT_GRAPH_FILTERS);
  const [filtersLoaded, setFiltersLoaded] = useState(false);
  const [viewReferenceModel, setViewReferenceModel] = useState(false);
  const [selectedTreeNodeId, setSelectedTreeNodeId] = useState<string>();
  const [selectedTestDetails, setSelectedTestDetails] = useState<AuditorTestDetailsSelection | undefined>(undefined);
  const [showHelp, setShowHelp] = useState(false);
  const appRef = useRef<HTMLDivElement>(null);
  const startedAt = useRef(performance.now());
  const completedElapsedSeconds = useRef<number | undefined>(undefined);
  const dataOperation = useFoblesDataOperationWhenReady(workOperationId);
  const data = dataOperation?.data;
  useEffect(() => {
    if (filtersLoaded) {
      dataOperation?.updateFilters(graphFilters);
    }
  }, [dataOperation, filtersLoaded, graphFilters]);
  const model = data?.model;
  useEffect(() => findingStore.subscribe(setSnapshot), [findingStore]);
  // AI NOTE: A cold item runs a live harvest before any data operation exists. Subscribe by work-operation id up front so
  // AI NOTE: that harvest's progress is visible instead of an empty dialog.
  useEffect(
    () =>
      subscribeFoblesAcquisitionProgress(workOperationId, (progress) => {
        extensionLog.debug("Auditor dialog: acquisition progress received", { workOperationId, progress });
        setAcquisitionProgress(progress);
      }),
    [workOperationId],
  );
  // AI NOTE: Persisting is gated on filtersLoaded so the initial defaults never overwrite the stored values.
  // AI NOTE: Graph filters fall back to the Graph's stored filters until the Auditor has its own stored set.
  useEffect(() => {
    let active = true;
    void Promise.all([
      getAuditorStatusFilter(),
      getAuditorCheckFilter(),
      getAuditorGraphFilters(),
      getReferenceGraphFilters(),
    ]).then(([storedStatuses, storedChecks, storedGraphFilters, referenceGraphFilters]) => {
      if (!active) {
        return;
      }
      if (storedStatuses) {
        setSelectedStatuses(new Set(ALL_STATUSES.filter((status) => storedStatuses.includes(status))));
      }
      if (storedChecks) {
        setSelectedChecks(new Set(storedChecks));
      }
      setGraphFilters({ ...referenceGraphFilters, ...storedGraphFilters });
      setFiltersLoaded(true);
    });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (filtersLoaded) {
      void setAuditorStatusFilter(Array.from(selectedStatuses));
    }
  }, [filtersLoaded, selectedStatuses]);
  useEffect(() => {
    if (filtersLoaded) {
      void setAuditorCheckFilter(Array.from(selectedChecks));
    }
  }, [filtersLoaded, selectedChecks]);
  useEffect(() => {
    if (filtersLoaded) {
      void setAuditorGraphFilters(graphFilters);
    }
  }, [filtersLoaded, graphFilters]);
  useEffect(() => {
    if (!dataOperation) {
      return;
    }
    const unsubscribeChange = dataOperation.subscribeChange(() => {
      setModelRevision((current) => current + 1);
    });
    const unsubscribeHarvest = dataOperation.subscribeHarvestProgress((progress) => {
      extensionLog.debug("Auditor dialog: harvest progress received", { workOperationId, progress });
      setHarvestProgress(progress);
    });
    const unsubscribeProcessing = dataOperation.subscribeProcessingProgress((progress) => {
      extensionLog.debug("Auditor dialog: processing progress received", {
        workOperationId,
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
  }, [dataOperation, workOperationId]);
  // AI NOTE: Fallback that needs no event replay: count unique item GUIDs whose every Resolve candidate node
  // AI NOTE: has reached a terminal processing state, the same unit Graph's Resolving bar counts.
  const derivedResolveProgress = useMemo<PhaseProgress | undefined>(() => {
    if (!data || !model) {
      return undefined;
    }
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
      if (terminal) {
        completed += 1;
      }
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
    const showHelpFromWindow = (): void => setShowHelp(true);
    window.addEventListener("fobles:auditor-help", showHelpFromWindow);
    return () => window.removeEventListener("fobles:auditor-help", showHelpFromWindow);
  }, []);
  useEffect(() => {
    logHeapSnapshot("auditor-opened", { workOperationId });
  }, [workOperationId]);
  useEffect(() => {
    if (resolveComplete) {
      logHeapSnapshot("auditor-resolve-complete", { workOperationId });
    }
  }, [resolveComplete, workOperationId]);
  const projectedFindings = useMemo(() => {
    const nodesById = model?.nodesById;
    return snapshot.map((finding) => {
      const node = finding.referenceModelNodeId ? nodesById?.get(finding.referenceModelNodeId) : undefined;
      if (!node) {
        return finding;
      }
      const presentation = getGraphPresentationState(node);
      const processingStatus = model?.processingStateByTreeNodeId.get(node.treeNodeId);
      const liveResolve =
        finding.checkKey === AUDIT_CHECK.REFERENCE_RESOLVED.KEY ? interpretResolveState(processingStatus) : undefined;
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
    return projectedFindings.filter((finding) => {
      if (selectedChecks.size > 0 && !selectedChecks.has(finding.checkKey)) {
        return false;
      }
      const node = finding.referenceModelNodeId ? nodesById?.get(finding.referenceModelNodeId) : undefined;
      const branch = node ? getGraphPresentationState(node).branch : undefined;
      if (branch && !graphFilters[branch]) {
        return false;
      }
      if (!normalizedQuery) {
        return true;
      }
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
      if (next.has(status)) {
        next.delete(status);
      } else {
        next.add(status);
      }
      return next;
    });
  }
  function toggleCheck(checkKey: string): void {
    setSelectedChecks((current) => {
      const next = new Set(current);
      if (next.has(checkKey)) {
        next.delete(checkKey);
      } else {
        next.add(checkKey);
      }
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
    <div ref={appRef} className="fobles-auditor-app">
      <AuditorSummary counts={summary} selectedStatuses={selectedStatuses} onToggleStatus={toggleStatus} />
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
        footer={
          <LifecycleProgressFooter
            harvestProgress={
              harvestProgress ?? (acquisitionProgress?.harvestRequired ? acquisitionProgress.progress : undefined)
            }
            resolveProgress={resolveProgress}
            elapsedSeconds={completedElapsedSeconds.current}
            buildingLabel="Building audit"
          />
        }
      />
      {viewReferenceModel && model ? (
        <ReferenceModelViewer referenceModel={model.referenceModel} onClose={() => setViewReferenceModel(false)} />
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
              modelRevision={modelRevision}
              graphFilters={graphFilters}
              onViewData={setSelectedTreeNodeId}
              onViewTestDetails={setSelectedTestDetails}
            />
          ) : null}
        </div>
        {selectedTreeNodeId && model ? (
          <FoblesDetailsWindow id="fobles-auditor-workspace-details" title="Auditor Details" ownerRef={appRef} onClose={() => setSelectedTreeNodeId(undefined)}>
            <NodeDetailsPanel selectedTreeNodeId={selectedTreeNodeId} nodesById={model.nodesById} processingStateByTreeNodeId={model.processingStateByTreeNodeId} />
          </FoblesDetailsWindow>
        ) : null}
      </div>
      <AuditorTestDetailsDialog selection={selectedTestDetails} onClose={() => setSelectedTestDetails(undefined)} />
      <AuditorHelpDialog open={showHelp} onClose={() => setShowHelp(false)} />
    </div>
  );
}
