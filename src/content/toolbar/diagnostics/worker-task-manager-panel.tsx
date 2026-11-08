// @source-path [fobles] src/content/toolbar/diagnostics/worker-task-manager-panel.tsx
import { useState } from "react";
import type { WorkerPoolStatus, WorkerTaskSnapshot } from "../../foundation/workers/pool/worker-pool-status.types";
import { DetailsPanel } from "../../shared/ui/details/details-panel";
import { DIAGNOSTIC_OPERATION_LABELS } from "./toolbar-diagnostics.const";

export type WorkerTaskManagerPanelProps = { status: WorkerPoolStatus | undefined };

function shortTarget(value: string): string {
  return value.length <= 12 ? value : `${value.slice(0, 7)}…`;
}

export function WorkerTaskManagerPanel({ status }: WorkerTaskManagerPanelProps) {
  const history = status?.taskHistory ?? [];
  const [selected, setSelected] = useState<WorkerTaskSnapshot>();
  return <div className="fobles-worker-task-manager">
    <div className="fobles-worker-task-manager-summary">Workers {status?.workerCount ?? 0}/{status?.maxWorkers ?? 0} · Activity {history.length}</div>
    <div className="fobles-worker-task-manager-grid">
      <table className="fobles-worker-task-manager-table">
        <thead><tr><th>Activity</th><th>Worker</th><th>Status</th><th>Task</th><th>Target</th><th>Class</th><th>Phase</th><th>Outcome</th><th>Rec</th></tr></thead>
        <tbody>{history.map((entry) => <tr key={entry.taskId} onDoubleClick={() => setSelected(entry)} title="Double-click for task details">
          <td>{new Date(entry.activityAt).toLocaleTimeString()}</td>
          <td title={entry.workerKey}>{entry.workerKey ? entry.workerKey.replace(/^iframe:/, "").slice(0, 7) : "—"}</td>
          <td>{entry.outcome === undefined ? "Active" : "Disposed"}</td>
          <td>{DIAGNOSTIC_OPERATION_LABELS[entry.type]}</td>
          <td title={entry.target}>{shortTarget(entry.target)}</td>
          <td title={entry.workClass}>{entry.workClass === "foreground" ? "FG" : "BG"}</td>
          <td>{entry.phase}</td><td>{entry.outcome ?? "—"}</td><td>{entry.recoveryCount}</td>
        </tr>)}</tbody>
      </table>
    </div>
    {selected ? <DetailsPanel title="Worker Task Details" closeLabel="Close worker task details" onClose={() => setSelected(undefined)}
      getCopyText={() => JSON.stringify(selected, null, 2)}>
      <dl className="fobles-worker-task-manager-details">
        <dt>Task ID</dt><dd>{selected.taskId}</dd><dt>Request ID</dt><dd>{selected.requestId}</dd><dt>Type</dt><dd>{selected.type}</dd>
        <dt>Target</dt><dd>{selected.target}</dd><dt>Class</dt><dd>{selected.workClass}</dd><dt>Phase</dt><dd>{selected.phase}</dd>
        <dt>Outcome</dt><dd>{selected.outcome ?? "—"}</dd><dt>Worker</dt><dd>{selected.workerKey ?? "—"}</dd>
        <dt>Elapsed</dt><dd>{selected.elapsedMs === undefined ? "—" : `${selected.elapsedMs} ms`}</dd><dt>Recoveries</dt><dd>{selected.recoveryCount}</dd>
      </dl>
      <h4>Snapshot</h4><pre>{JSON.stringify(selected, null, 2)}</pre>
      <h4>Request Payload{selected.requestPayload.truncated ? " (truncated)" : ""}</h4><pre>{JSON.stringify(selected.requestPayload.value, null, 2)}</pre>
      <h4>Response Payload{selected.responsePayload?.truncated ? " (truncated)" : ""}</h4><pre>{selected.responsePayload ? JSON.stringify(selected.responsePayload.value, null, 2) : "Pending"}</pre>
    </DetailsPanel> : null}
  </div>;
}
