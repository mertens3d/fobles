// @source-path [fobles] src/content/toolbar/diagnostics/worker-task-manager-panel.tsx

import { useEffect, useRef, useState } from "react";
import type { WorkerPoolStatus } from "../../foundation/workers/pool/pool.types";
import type { WorkerTaskSnapshot } from "../../foundation/workers/pool/pool.types";
import { extensionLog } from "../../logger";
import { FoblesDetailsWindow } from "../../shared/dialog/fobles-details-window";
import { CollapsibleSection } from "../../shared/ui/collapsible-section/collapsible-section";
import { useWorkProgressSnapshots } from "../../shared/ui/work-progress/use-work-progress";
import { WorkProgress } from "../../shared/ui/work-progress/work-progress";
import { WorkerStateDetails } from "./worker-state-details";
import { WORKER_MONITOR_COLUMNS } from "./worker-monitor.const";
import { historyMonitorRow, liveWorkerMonitorRow, workerTaskItemName } from "./worker-monitor-rows";
import type { WorkerMonitorRow } from "./worker-monitor-row.types";

export type WorkerTaskManagerPanelProps = { status: WorkerPoolStatus | undefined };

// Agent: Every live work session with the same progress display the footers and toolbar use. With no sessions the
// Agent: idle display stays in place instead of disappearing.
function WorkSessionList() {
  const snapshots = useWorkProgressSnapshots();
  return (
    <div className="fobles-worker-monitor-sessions">
      {snapshots.length ? snapshots.map((snapshot) => (
        <div className="fobles-worker-monitor-session" key={snapshot.sessionId}>
          <WorkProgress snapshot={snapshot} />
        </div>
      )) : (
        <div className="fobles-worker-monitor-session">
          <WorkProgress snapshot={undefined} />
        </div>
      )}
    </div>
  );
}

// Agent: The one table used by both Worker State and Work Session History, so their columns can never drift apart.
// Agent: A row with a task snapshot opens Worker State Details on double-click.
function WorkerMonitorTable({ rows, onSelect }: { rows: readonly WorkerMonitorRow[]; onSelect: (entry: WorkerTaskSnapshot) => void }) {
  return (
    <table className="fobles-worker-task-manager-table">
      <thead>
        <tr>{WORKER_MONITOR_COLUMNS.map((column) => <th key={column.key} title={column.help}>{column.label}</th>)}</tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.key} className={row.snapshot ? "" : "is-static"} title={row.snapshot ? "Double-click for task details" : undefined}
            onDoubleClick={() => (row.snapshot ? onSelect(row.snapshot) : undefined)}>
            {WORKER_MONITOR_COLUMNS.map((column) => (
              <td key={column.key} title={column.titleKey ? row[column.titleKey] || row[column.key] : row[column.key]}>{row[column.key]}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// Agent: The legend is generated from the shared column definitions, so it always matches the tables.
function ColumnLegend() {
  const [expanded, setExpanded] = useState(false);
  return (
    <CollapsibleSection title="Column legend" expanded={expanded} onExpandedChange={setExpanded}>
      <dl>
        {WORKER_MONITOR_COLUMNS.map((column) => [<dt key={`${column.key}-term`}>{column.label}</dt>, <dd key={`${column.key}-text`}>{column.help}</dd>])}
      </dl>
    </CollapsibleSection>
  );
}

function useWorkerMonitorLogging(status: WorkerPoolStatus | undefined, settledCount: number): void {
  const workers = status?.workers ?? [];
  const signature = workers.map((worker) => `${worker.workerNumber}:${worker.state}:${worker.activeTask?.taskId ?? "idle"}`).join("|");
  useEffect(() => {
    extensionLog.debug("Worker Monitor: native worker state", { workers, workerStateCount: workers.length, sessionHistoryCount: settledCount });
  }, [signature, status?.taskHistory?.length]);
}

export function WorkerTaskManagerPanel({ status }: WorkerTaskManagerPanelProps) {
  const history = status?.taskHistory ?? [];
  const workers = status?.workers ?? [];
  // Agent: Work Session History: every settled worker task. A history row is the final state of a task.
  const sessionHistory = history.filter((entry) => entry.outcome !== undefined);
  const [selected, setSelected] = useState<WorkerTaskSnapshot>();
  const panelRef = useRef<HTMLDivElement>(null);
  useWorkerMonitorLogging(status, sessionHistory.length);

  function select(entry: WorkerTaskSnapshot): void {
    extensionLog.debug("Worker Monitor: task details requested", {
      taskId: entry.taskId, requestId: entry.requestId, workerKey: entry.workerKey, ownerConnected: panelRef.current?.isConnected === true,
    });
    setSelected(entry);
  }

  function closeDetails(): void {
    extensionLog.debug("Worker Monitor: task details closed", { taskId: selected?.taskId });
    setSelected(undefined);
  }

  return (
    <div ref={panelRef} className={`fobles-worker-task-manager${selected ? " has-details" : ""}`}>
      <ColumnLegend />
      <div className="fobles-worker-task-manager-summary">
        Workers {status?.workerCount ?? 0}/{status?.maxWorkers ?? 0} · Worker State {workers.length} · Work Session History{" "}
        {sessionHistory.length}
      </div>
      <div className="fobles-worker-monitor-workspace">
        <div className="fobles-worker-task-manager-grid">
          <section className="fobles-worker-monitor-group">
            <h3>Work Sessions</h3>
            <WorkSessionList />
          </section>
          <section className="fobles-worker-monitor-group">
            <h3>Worker State</h3>
            <WorkerMonitorTable rows={workers.map((worker) => liveWorkerMonitorRow(worker, history))} onSelect={select} />
            {workers.length ? null : <div className="fobles-worker-task-manager-empty">No live pool workers.</div>}
          </section>
          <section className="fobles-worker-monitor-group">
            <h3>Work Session History</h3>
            <WorkerMonitorTable rows={sessionHistory.map(historyMonitorRow)} onSelect={select} />
            {sessionHistory.length ? null : <div className="fobles-worker-task-manager-empty">No historical worker activity.</div>}
          </section>
        </div>
        {selected ? (
          <FoblesDetailsWindow ownerRef={panelRef} id="fobles-worker-state-details" title="Worker State Details" onClose={closeDetails}>
            <WorkerStateDetails snapshot={selected} itemName={workerTaskItemName(selected)} />
          </FoblesDetailsWindow>
        ) : null}
      </div>
    </div>
  );
}
