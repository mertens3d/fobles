// @source-path [fobles] src/content/toolbar/diagnostics/worker-state-details.tsx
import type { WorkerTaskSnapshot } from "../../foundation/workers/pool/pool.types";
import { DetailsPanel } from "../../shared/ui/details/details-panel";

export type WorkerStateDetailsProps = { snapshot: WorkerTaskSnapshot; itemName: string };

export function WorkerStateDetails({ snapshot, itemName }: WorkerStateDetailsProps) {
  return <DetailsPanel title="" getCopyText={() => JSON.stringify(snapshot, null, 2)}>
    <dl className="fobles-worker-task-manager-details"><dt>Task ID</dt><dd>{snapshot.taskId}</dd><dt>Request ID</dt><dd>{snapshot.requestId}</dd><dt>Type</dt><dd>{snapshot.type}</dd><dt>Item Name</dt><dd>{itemName}</dd><dt>Target</dt><dd>{snapshot.target}</dd><dt>Class</dt><dd>{snapshot.workClass}</dd><dt>Phase</dt><dd>{snapshot.phase}</dd><dt>Outcome</dt><dd>{snapshot.outcome ?? "—"}</dd><dt>Worker</dt><dd>{snapshot.workerKey ?? "—"}</dd><dt>Elapsed</dt><dd>{snapshot.elapsedMs === undefined ? "—" : `${snapshot.elapsedMs} ms`}</dd><dt>Recoveries</dt><dd>{snapshot.recoveryCount}</dd></dl>
    <h4>Snapshot</h4><pre>{JSON.stringify(snapshot, null, 2)}</pre>
    <h4>Request Payload{snapshot.requestPayload.truncated ? " (truncated)" : ""}</h4><pre>{JSON.stringify(snapshot.requestPayload.value, null, 2)}</pre>
    <h4>Response Payload{snapshot.responsePayload?.truncated ? " (truncated)" : ""}</h4><pre>{snapshot.responsePayload ? JSON.stringify(snapshot.responsePayload.value, null, 2) : "Pending"}</pre>
  </DetailsPanel>;
}
