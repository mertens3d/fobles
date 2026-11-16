// @source-path [fobles] src/content/foundation/workers/progress/work-progress-snapshot.ts

import type { ActivityState } from "../../../shared/activity/activity.types";
import { WORK_SCHEDULING } from "../work-scheduling.const";
import { WORK_PROGRESS } from "./work-progress.const";
import type { RelevantWorkProgress, WorkPhaseProgress, WorkProgressEntry } from "./work-progress.types";
import type { WorkProgressSnapshot } from "./work-progress.types";
import type { WorkSessionDescription } from "./work-progress.types";

const SETTLED_STATES: ReadonlySet<ActivityState> = new Set(WORK_PROGRESS.SETTLED_TASK_STATES);

// Agent: Phases are the provider's own logical counts (acquisition steps, harvest jobs, validated items). Sessions
// Agent: that report no phases (e.g. structural discovery) fall back to counting their frame tasks.
function countWork(entry: WorkProgressEntry): { completed: number; max: number } {
  const phases = Array.from(entry.phases.values());
  const states = Array.from(entry.taskStates.values());
  return phases.length > 0
    ? {
        completed: phases.reduce((sum, phase) => sum + Math.max(0, phase.completed), 0),
        max: phases.reduce((sum, phase) => sum + Math.max(0, phase.max), 0),
      }
    : { completed: states.filter((state) => SETTLED_STATES.has(state)).length, max: states.length };
}

function isPhaseRunning(phase: WorkPhaseProgress): boolean {
  return phase.status === "running";
}

function isActive(entry: WorkProgressEntry): boolean {
  const unsettledTask = Array.from(entry.taskStates.values()).some((state) => !SETTLED_STATES.has(state));
  return unsettledTask || Array.from(entry.phases.values()).some(isPhaseRunning);
}

export function describeWorkProgress(entry: Pick<WorkProgressEntry, "description" | "workClass">): string {
  const description: WorkSessionDescription = entry.description;
  const title = description.title?.trim() || WORK_PROGRESS.DEFAULT_TITLE[entry.workClass];
  const target = description.target?.trim();
  return target ? `${title} "${target}"` : title;
}

export function createWorkProgressSnapshot(entry: WorkProgressEntry): WorkProgressSnapshot {
  const { completed, max } = countWork(entry);
  return {
    sessionId: entry.sessionId,
    label: describeWorkProgress(entry),
    completed: Math.min(completed, max),
    max,
    startedAt: entry.startedAt,
    status: isActive(entry) ? "active" : "idle",
    workClass: entry.workClass,
    currentTask: entry.currentTask,
  };
}

function relevanceOrder(left: WorkProgressSnapshot, right: WorkProgressSnapshot): number {
  const leftForeground = left.workClass === WORK_SCHEDULING.FOREGROUND ? 0 : 1;
  const rightForeground = right.workClass === WORK_SCHEDULING.FOREGROUND ? 0 : 1;
  return leftForeground - rightForeground || right.startedAt - left.startedAt;
}

// Agent: The toolbar shows one session: foreground before background, then the most recently started. Every other
// Agent: active session is only counted ("+N more"); the Worker Monitor lists them all.
export function pickRelevantWorkProgress(snapshots: readonly WorkProgressSnapshot[]): RelevantWorkProgress {
  const active = snapshots.filter((snapshot) => snapshot.status === "active").sort(relevanceOrder);
  return { primary: active[0], others: Math.max(0, active.length - 1) };
}

export function workProgressPercent(snapshot: Pick<WorkProgressSnapshot, "completed" | "max" | "status">): number {
  const settledWithoutWork = snapshot.max === 0 && snapshot.status === "idle";
  const percent = snapshot.max > 0 ? Math.round((snapshot.completed / snapshot.max) * 100) : 0;
  return settledWithoutWork ? 100 : percent;
}
