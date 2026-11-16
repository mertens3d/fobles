// @source-path [fobles] src/content/toolbar/diagnostics/worker-monitor-row.types.ts

import type { WorkerTaskSnapshot } from "../../foundation/workers/pool/pool.types";

// Agent: One row shape for both Worker State (live worker slots) and Work Session History (settled tasks), so the two
// Agent: tables share exactly the same columns. A value a row cannot know is the empty-cell marker.
export type WorkerMonitorRow = {
  key: string;
  time: string;
  worker: string;
  workerTitle: string;
  state: string;
  session: string;
  task: string;
  itemName: string;
  target: string;
  targetTitle: string;
  workClass: string;
  workClassTitle: string;
  phase: string;
  outcome: string;
  recoveries: string;
  recoveriesTitle: string;
  noProgress: string;
  url: string;
  snapshot: WorkerTaskSnapshot | undefined;
};

export type WorkerMonitorColumnKey = "time" | "worker" | "state" | "session" | "task" | "itemName" | "target"
  | "workClass" | "phase" | "outcome" | "recoveries" | "noProgress" | "url";

export type WorkerMonitorColumn = {
  key: WorkerMonitorColumnKey;
  label: string;
  help: string;
  titleKey?: "workerTitle" | "targetTitle" | "workClassTitle" | "recoveriesTitle";
};
