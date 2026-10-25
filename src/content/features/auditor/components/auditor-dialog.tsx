// @source-path [fobles] src/content/features/auditor/components/auditor-dialog.tsx

import { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { showFoblesCleanupDialog } from "../../../../shared/error-dialog";
import { getReferenceGraphFilters } from "../../../../shared/reference-graph-settings";
import type { SitecoreHarvestFiltersState } from "../../../sitecore-harvester/sitecore-harvester.types";
import { getFoblesDataSession } from "../../../shared/data/fobles-data-service";
import { createDialogCloseButton } from "../../../shared/dialog/dialog-close-button";
import type { PhaseProgress } from "../../../shared/ui/reference-controls/lifecycle.types";
import { PhaseProgressBar } from "../../../shared/ui/reference-controls/phase-progress-bar";
import { NodeDetailsPanel } from "../../reference-graph/components/node-details-panel";
import { getGraphPresentationState } from "../../reference-graph/graph-nodes/graph-presentation-state";
import { ReferenceModelViewer } from "../../reference-model/components/reference-model-viewer";
import type { AuditFinding, AuditFindingStatus } from "../audit-finding.types";
import type { AuditFindingStore } from "../audit-finding-store";
import {
  interpretResolveState,
  REFERENCE_RESOLVED_CHECK_KEY,
} from "../checks/reference-resolved-check";
import { downloadAuditFindingsCsv } from "../export/audit-csv-exporter";
import { AuditorGrid } from "./auditor-grid";
import { AuditorSummary } from "./auditor-summary";
import { AuditorToolbar } from "./auditor-toolbar";

export const AUDITOR_DIALOG_ID = "fobles-auditor-dialog";

const ALL_STATUSES: readonly AuditFindingStatus[] = [
  "pending",
  "passed",
  "warning",
  "error",
];

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

function AuditorApp({
  doc,
  findingStore,
  workSessionId,
}: AuditorAppProps) {
  const [snapshot, setSnapshot] = useState<readonly AuditFinding[]>(
    () => findingStore.getSnapshot(),
  );
  const [query, setQuery] = useState("");
  const [modelRevision, setModelRevision] = useState(0);
  const [harvestProgress, setHarvestProgress] = useState<PhaseProgress>();
  const [selectedStatuses, setSelectedStatuses] = useState<
    ReadonlySet<AuditFindingStatus>
  >(() => new Set(ALL_STATUSES));
  const [selectedChecks, setSelectedChecks] = useState<
    ReadonlySet<string>
  >(() => new Set());
  const [graphFilters, setGraphFilters] =
    useState<SitecoreHarvestFiltersState>(DEFAULT_GRAPH_FILTERS);
  const [viewReferenceModel, setViewReferenceModel] = useState(false);
  const [selectedTreeNodeId, setSelectedTreeNodeId] =
    useState<string>();
  const [showHelp, setShowHelp] = useState(false);

  useEffect(
    () => findingStore.subscribe(setSnapshot),
    [findingStore],
  );

  useEffect(() => {
    void getReferenceGraphFilters().then(setGraphFilters);
  }, []);

  useEffect(() => {
    const dataSession = getFoblesDataSession(workSessionId);

    if (!dataSession) return;

    const unsubscribeChange = dataSession.subscribeChange(() => {
      setModelRevision((current) => current + 1);
    });

    const unsubscribeHarvest =
      dataSession.subscribeHarvestProgress((progress) => {
        setHarvestProgress(progress);
      });

    return () => {
      unsubscribeChange();
      unsubscribeHarvest();
    };
  }, [workSessionId]);

  const dataSession = getFoblesDataSession(workSessionId);
  const data = dataSession?.data;
  const model = data?.model;

  const resolveProgress = useMemo<PhaseProgress | undefined>(() => {
    if (!model || !data) return undefined;

    const candidateIds = Array.from(
      data.resolveCandidateTreeNodeIds,
    );
    const completed = candidateIds.filter((treeNodeId) => {
      const status =
        model.processingStateByTreeNodeId.get(treeNodeId);

      return (
        status !== undefined &&
        status !== "pending" &&
        status !== "enriching"
      );
    }).length;

    return {
      completed,
      max: candidateIds.length,
      status:
        completed >= candidateIds.length
          ? "complete"
          : "running",
    };
  }, [data, model, modelRevision]);

  const projectedFindings = useMemo(() => {
    const nodesById = model?.nodesById;

    return snapshot.map((finding) => {
      const node = finding.referenceModelNodeId
        ? nodesById?.get(finding.referenceModelNodeId)
        : undefined;

      if (!node) return finding;

      const presentation = getGraphPresentationState(node);
      const processingStatus =
        model?.processingStateByTreeNodeId.get(node.treeNodeId);
      const liveResolve =
        finding.checkKey === REFERENCE_RESOLVED_CHECK_KEY
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
    const anyGraphFilterEnabled =
      Object.values(graphFilters).some(Boolean);

    return projectedFindings.filter((finding) => {
      if (
        selectedChecks.size > 0 &&
        !selectedChecks.has(finding.checkKey)
      ) {
        return false;
      }

      const node = finding.referenceModelNodeId
        ? nodesById?.get(finding.referenceModelNodeId)
        : undefined;
      const branch = node
        ? getGraphPresentationState(node).branch
        : undefined;

      if (
        anyGraphFilterEnabled &&
        branch &&
        !graphFilters[branch]
      ) {
        return false;
      }

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
        .filter(
          (value): value is string => Boolean(value),
        )
        .join("\n")
        .toLowerCase();

      return searchable.includes(normalizedQuery);
    });
  }, [
    projectedFindings,
    selectedChecks,
    query,
    graphFilters,
    model,
  ]);

  const visibleFindings = useMemo(
    () =>
      filterableFindings.filter((finding) =>
        selectedStatuses.has(finding.status),
      ),
    [filterableFindings, selectedStatuses],
  );

  const summary = useMemo(() => {
    const counts = {
      pending: 0,
      passed: 0,
      warning: 0,
      error: 0,
      total: filterableFindings.length,
    };

    filterableFindings.forEach((finding) => {
      counts[finding.status] += 1;
    });

    return counts;
  }, [filterableFindings]);

  function toggleStatus(
    status: AuditFindingStatus,
  ): void {
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
    downloadAuditFindingsCsv(
      doc,
      visibleFindings,
      `fobles-auditor-findings-${Date.now()}.csv`,
    );
  }

  return (
    <div className="fobles-auditor-app">
      <AuditorSummary
        counts={summary}
        selectedStatuses={selectedStatuses}
        onToggleStatus={toggleStatus}
      />

      <AuditorToolbar
        query={query}
        onQueryChange={setQuery}
        selectedChecks={selectedChecks}
        onToggleCheck={toggleCheck}
        onReset={resetFilters}
        onExport={exportCsv}
        graphFilters={graphFilters}
        onGraphFilterChange={(key, checked) => {
          setGraphFilters((current) => ({
            ...current,
            [key]: checked,
          }));
        }}
        onClearGraphFilters={() => {
          setGraphFilters(
            (current) =>
              Object.fromEntries(
                Object.keys(current).map((key) => [
                  key,
                  false,
                ]),
              ) as unknown as SitecoreHarvestFiltersState,
          );
        }}
        onViewReferenceModel={() =>
          setViewReferenceModel(true)
        }
        onHelp={() => setShowHelp(true)}
      />

      <div className="fobles-auditor-progress">
        <PhaseProgressBar
          label="Harvesting"
          progress={harvestProgress}
        />
        <PhaseProgressBar
          label="Resolving"
          progress={resolveProgress}
        />
      </div>

      {model ? (
        <AuditorGrid
          referenceModelRoot={model.referenceModel}
          findings={visibleFindings}
          onViewData={setSelectedTreeNodeId}
        />
      ) : null}

      {viewReferenceModel && model ? (
        <ReferenceModelViewer
          referenceModel={model.referenceModel}
          onClose={() => setViewReferenceModel(false)}
        />
      ) : null}

      {selectedTreeNodeId && model ? (
        <div
          className="fobles-auditor-data-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) {
              setSelectedTreeNodeId(undefined);
            }
          }}
        >
          <NodeDetailsPanel
            selectedTreeNodeId={selectedTreeNodeId}
            nodesById={model.nodesById}
            processingStateByTreeNodeId={
              model.processingStateByTreeNodeId
            }
          />
        </div>
      ) : null}

      {showHelp ? (
        <div
          className="fobles-auditor-help-backdrop"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) {
              setShowHelp(false);
            }
          }}
        >
          <section
            className="fobles-auditor-help"
            role="dialog"
            aria-modal="true"
            aria-label="Auditor help"
          >
            <button
              type="button"
              className="fobles-auditor-help-close"
              onClick={() => setShowHelp(false)}
            >
              ×
            </button>

            <h2>Fobles Auditor</h2>

            <p>
              Expand the Reference Model relationship tree to
              inspect attached audit findings.
            </p>

            <p>
              The status checkboxes independently include or
              exclude each result state.
            </p>
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

    const closeButton = createDialogCloseButton(
      doc,
      dialog,
    );
    const appHost = doc.createElement("div");
    appHost.style.cssText =
      "position:relative;width:100%;height:100%;";
    const appRoot = createRoot(appHost);

    dialog.append(closeButton, appHost);
    doc.body.appendChild(dialog);

    dialog.addEventListener(
      "close",
      () => {
        void (async () => {
          const cleanupDialog =
            showFoblesCleanupDialog(doc);

          try {
            await onCancelRequested();
          } finally {
            if (cleanupDialog.isConnected) {
              cleanupDialog.close();
            }

            appRoot.unmount();
            dialog.remove();
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