// @source-path [fobles] src/content/foundation/workers/progress/work-progress.types.ts

import type { ActivityState } from "../../../shared/activity/activity.types";
import type { WorkClass } from "../work-scheduling.types";

export type WorkPhaseStatus = "idle" | "running" | "complete";

export type WorkPhaseProgress = { completed: number; max: number; status: WorkPhaseStatus };

export type WorkSessionDescription = { title?: string; target?: string };

export type WorkProgressTask = { taskId: string; label: string; state: ActivityState };

export type WorkProgressStatus = "active" | "idle";

export type WorkProgressSnapshot = {
  sessionId: string;
  label: string;
  completed: number;
  max: number;
  startedAt: number;
  status: WorkProgressStatus;
  workClass: WorkClass;
  currentTask?: WorkProgressTask;
};

export type WorkProgressListener = (snapshots: readonly WorkProgressSnapshot[]) => void;

export type WorkProgressRegistration = {
  describe: (description: WorkSessionDescription) => void;
  reportPhase: (phaseKey: string, progress: WorkPhaseProgress) => void;
  attachRequest: (requestId: string) => void;
  dispose: () => void;
};

export type WorkProgressEntry = {
  sessionId: string;
  description: WorkSessionDescription;
  phases: Map<string, WorkPhaseProgress>;
  startedAt: number;
  taskStates: Map<string, ActivityState>;
  workClass: WorkClass;
  currentTask?: WorkProgressTask;
};

export type RelevantWorkProgress = { others: number; primary?: WorkProgressSnapshot };
