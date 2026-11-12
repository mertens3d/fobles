// @source-path [fobles] src/content/foundation/workers/session/work-session.types.ts

import type { HealthReport } from "../../diagnostics/diagnostics.types";
import type { WorkerTask, WorkerTaskResult } from "../tasks/worker-task.types";
import type { WorkClass } from "../work-scheduling.types";

export type WorkSessionState = "open" | "cancelling" | "completed" | "released";

export type WorkSessionTask = WorkerTask extends infer T
  ? T extends WorkerTask
    ? Omit<T, "requestId" | "workClass">
    : never
  : never;

export type WorkSession = {
  readonly id: string;
  readonly signal: AbortSignal;
  readonly state: WorkSessionState;
  readonly workClass: WorkClass;
  getHealth: () => HealthReport;
  registerHealthProvider: (provider: { getHealth: () => HealthReport }) => () => void;
  markProgress: (reason: string) => void;
  runTask: (task: WorkSessionTask) => Promise<WorkerTaskResult | undefined>;
  complete: () => Promise<void>;
  cancel: () => Promise<void>;
};
