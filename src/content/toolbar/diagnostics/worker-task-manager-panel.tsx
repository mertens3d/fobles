// @source-path [fobles] src/content/toolbar/diagnostics/worker-task-manager-panel.tsx
import { useEffect, useRef, useState } from "react";
import type { WorkerPoolStatus } from "../../foundation/workers/pool/pool.types";
import type { WorkerPoolWorkerStatus } from "../../foundation/workers/pool/pool.types";
import type { WorkerTaskSnapshot } from "../../foundation/workers/pool/pool.types";
import { extensionLog } from "../../logger";
import { FoblesDetailsWindow } from "../../shared/dialog/fobles-details-window";
import { CollapsibleSection } from "../../shared/ui/collapsible-section/collapsible-section";
import { WorkerStateDetails } from "./worker-state-details";
import { DIAGNOSTIC_OPERATION_LABELS } from "./toolbar-diagnostics.const";

export type WorkerTaskManagerPanelProps = { status: WorkerPoolStatus | undefined };

const COLUMN_HELP = {
  activity: "Time of the latest recorded lifecycle activity.",
  worker: "Worker target assigned to the task. Iframe workers show their worker identifier.",
  status: "Mounted means the worker iframe is currently present in the worker container; Historical means it is not.",
  task: "Worker operation represented by this snapshot.",
  itemName: "Sitecore item name when it exists in the captured request payload.",
  target: "Requested item identifier, path, or URL.",
  workClass: "FG is foreground work; BG is background work.",
  phase: "Latest recorded lifecycle phase.",
  outcome: "Terminal task result when available.",
  recoveries: "Number of worker recovery attempts made while processing this task.",
} as const;

function shortTarget(value: string): string {
  return value.length <= 12 ? value : `${value.slice(0, 7)}…`;
}

function objectValue(value: unknown, key: string): unknown {
  return value && typeof value === "object" && key in value ? (value as Record<string, unknown>)[key] : undefined;
}

function itemName(entry: WorkerTaskSnapshot): string {
  const response = entry.responsePayload?.value;
  const resolvedName = objectValue(
    objectValue(objectValue(objectValue(response, "payload"), "result"), "value"),
    "scItemName",
  );
  if (typeof resolvedName === "string" && resolvedName) {
    return resolvedName;
  }
  const requested = objectValue(entry.requestPayload.value, "requested");
  const requestedName = objectValue(requested, "scItemName") ?? objectValue(requested, "name");
  return typeof requestedName === "string" && requestedName ? requestedName : "—";
}

function WorkerStateTable({
  workers,
  history,
}: {
  workers: readonly WorkerPoolWorkerStatus[];
  history: readonly WorkerTaskSnapshot[];
}) {
  return (
    <div className="fobles-worker-state-grid" role="table">
      <div className="fobles-worker-state-grid-row fobles-worker-state-grid-header" role="row">
        <span>Worker</span>
        <span>State</span>
        <span title={COLUMN_HELP.itemName}>Item Name</span>
        <span>Target Kind</span>
        <span>Active Task</span>
        <span>URL</span>
        <span>No Progress</span>
        <span title={COLUMN_HELP.recoveries}>Recoveries</span>
      </div>
      {workers.map((worker) => {
        const snapshot = worker.activeTask
          ? history.find((entry) => entry.taskId === worker.activeTask?.taskId)
          : undefined;
        const knownItemName = snapshot ? itemName(snapshot) : "—";
        const activeTask = worker.activeTask
          ? `${worker.activeTask.phase} · ${DIAGNOSTIC_OPERATION_LABELS[worker.activeTask.type]}`
          : "—";
        return (
          <div className="fobles-worker-state-grid-row" role="row" key={worker.workerNumber}>
            <span>{worker.workerNumber}</span>
            <span>{worker.state}</span>
            <span title={knownItemName}>{knownItemName}</span>
            <span>{worker.targetKind ?? "—"}</span>
            <span title={activeTask}>{activeTask}</span>
            <span title={worker.currentUrl}>{worker.currentUrl ?? "—"}</span>
            <span>{worker.noProgressMs} ms</span>
            <span>{worker.recoveryCount}</span>
          </div>
        );
      })}
    </div>
  );
}

function WorkerMonitorTable({
  entries,
  mounted,
  onSelect,
}: {
  entries: readonly WorkerTaskSnapshot[];
  mounted: boolean;
  onSelect: (entry: WorkerTaskSnapshot) => void;
}) {
  return (
    <table className="fobles-worker-task-manager-table">
      <thead>
        <tr>
          <th>Activity</th>
          <th>Worker</th>
          <th>Status</th>
          <th>Task</th>
          <th>Item Name</th>
          <th>Target</th>
          <th>Class</th>
          <th>Phase</th>
          <th>Outcome</th>
          <th>Recoveries</th>
        </tr>
      </thead>
      <tbody>
        {entries.map((entry) => (
          <tr key={entry.taskId} onDoubleClick={() => onSelect(entry)} title="Double-click for task details">
            <td>{new Date(entry.activityAt).toLocaleTimeString()}</td>
            <td title={entry.workerKey}>
              {entry.workerKey ? entry.workerKey.replace(/^iframe:/, "").slice(0, 7) : "—"}
            </td>
            <td>{mounted ? "Mounted" : "Historical"}</td>
            <td>{DIAGNOSTIC_OPERATION_LABELS[entry.type]}</td>
            <td title={itemName(entry)}>{itemName(entry)}</td>
            <td title={entry.target}>{shortTarget(entry.target)}</td>
            <td title={entry.workClass}>{entry.workClass === "foreground" ? "FG" : "BG"}</td>
            <td>{entry.phase}</td>
            <td>{entry.outcome ?? "—"}</td>
            <td>{entry.recoveryCount}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function WorkerTaskManagerPanel({ status }: WorkerTaskManagerPanelProps) {
  const history = status?.taskHistory ?? [];
  const flightRecorder = history.filter((entry) => entry.outcome !== undefined);
  const [selected, setSelected] = useState<WorkerTaskSnapshot>();
  const [legendExpanded, setLegendExpanded] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const workers = status?.workers ?? [];
  const workerSignature = workers
    .map((worker) => `${worker.workerNumber}:${worker.state}:${worker.activeTask?.taskId ?? "idle"}`)
    .join("|");

  useEffect(() => {
    extensionLog.debug("Worker Monitor: native worker state", {
      workers,
      workerStateCount: workers.length,
      flightRecorderCount: flightRecorder.length,
    });
  }, [workerSignature, history.length]);

  function select(entry: WorkerTaskSnapshot): void {
    extensionLog.debug("Worker Monitor: task details requested", {
      taskId: entry.taskId,
      requestId: entry.requestId,
      workerKey: entry.workerKey,
      ownerConnected: panelRef.current?.isConnected === true,
    });
    setSelected(entry);
  }

  function closeDetails(): void {
    extensionLog.debug("Worker Monitor: task details closed", { taskId: selected?.taskId });
    setSelected(undefined);
  }

  return (
    <div ref={panelRef} className={`fobles-worker-task-manager${selected ? " has-details" : ""}`}>
      <CollapsibleSection title="Column legend" expanded={legendExpanded} onExpandedChange={setLegendExpanded}>
        <dl>
          <dt>Activity</dt>
          <dd>Latest activity time.</dd>
          <dt>Worker</dt>
          <dd>Pool worker.</dd>
          <dt>State</dt>
          <dd>Native worker state.</dd>
          <dt>Item Name</dt>
          <dd>Known item name.</dd>
          <dt>Status</dt>
          <dd>Live or historical.</dd>
          <dt>Task</dt>
          <dd>Worker operation.</dd>
          <dt>Target</dt>
          <dd>Item, path, or URL.</dd>
          <dt>Class</dt>
          <dd>FG or BG.</dd>
          <dt>Phase</dt>
          <dd>Lifecycle phase.</dd>
          <dt>Outcome</dt>
          <dd>Terminal result.</dd>
          <dt>Target Kind</dt>
          <dd>Worker target type.</dd>
          <dt>Active Task</dt>
          <dd>Current work.</dd>
          <dt>URL</dt>
          <dd>Worker document.</dd>
          <dt>No Progress</dt>
          <dd>Time since progress.</dd>
          <dt>Recoveries</dt>
          <dd>Recovery attempts.</dd>
        </dl>
      </CollapsibleSection>
      <div className="fobles-worker-task-manager-summary">
        Workers {status?.workerCount ?? 0}/{status?.maxWorkers ?? 0} · Worker State {workers.length} · Flight Recorder{" "}
        {flightRecorder.length}
      </div>
      <div className="fobles-worker-monitor-workspace">
        <div className="fobles-worker-task-manager-grid">
          <section className="fobles-worker-monitor-group">
            <h3>Worker State</h3>
            <WorkerStateTable workers={workers} history={history} />
            {workers.length ? null : <div className="fobles-worker-task-manager-empty">No live pool workers.</div>}
          </section>
          <section className="fobles-worker-monitor-group">
            <h3>Flight Recorder</h3>
            <WorkerMonitorTable entries={flightRecorder} mounted={false} onSelect={select} />
            {flightRecorder.length ? null : (
              <div className="fobles-worker-task-manager-empty">No historical worker activity.</div>
            )}
          </section>
        </div>
        {selected ? (
          <FoblesDetailsWindow
            ownerRef={panelRef}
            id="fobles-worker-state-details"
            title="Worker State Details"
            onClose={closeDetails}
          >
            <WorkerStateDetails snapshot={selected} itemName={itemName(selected)} />
          </FoblesDetailsWindow>
        ) : null}
      </div>
    </div>
  );
}
