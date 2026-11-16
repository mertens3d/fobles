// @source-path [fobles] src/content/foundation/workers/progress/work-progress-registry.ts

import { subscribeActivity } from "../../../shared/activity/activity-events";
import type { ActivityEvent } from "../../../shared/activity/activity.types";
import type { WorkClass } from "../work-scheduling.types";
import { WORK_PROGRESS } from "./work-progress.const";
import { createWorkProgressSnapshot, describeWorkProgress } from "./work-progress-snapshot";
import type { WorkPhaseProgress, WorkProgressEntry, WorkProgressListener } from "./work-progress.types";
import type { WorkProgressRegistration, WorkProgressSnapshot, WorkSessionDescription } from "./work-progress.types";

// Agent: The work session is the progress provider. Every display (Auditor and Graph footers, toolbar, Worker
// Agent: Monitor) reads these snapshots and never derives its own counts.
const entries = new Map<string, WorkProgressEntry>();
const sessionIdByRequestId = new Map<string, string>();
const recentLabelByRequestId = new Map<string, string>();
const listeners = new Set<WorkProgressListener>();
let stopActivity: (() => void) | undefined;
let notifyScheduled = false;

function snapshots(): WorkProgressSnapshot[] {
  return Array.from(entries.values(), createWorkProgressSnapshot);
}

function notify(): void {
  notifyScheduled = false;
  const current = snapshots();
  listeners.forEach((listener) => listener(current));
}

function scheduleNotify(): void {
  if (!notifyScheduled) {
    notifyScheduled = true;
    queueMicrotask(notify);
  }
}

function rememberLabel(requestId: string, label: string): void {
  recentLabelByRequestId.delete(requestId);
  recentLabelByRequestId.set(requestId, label);
  const oldest = recentLabelByRequestId.keys().next();
  if (recentLabelByRequestId.size > WORK_PROGRESS.RECENT_LABEL_LIMIT && !oldest.done) {
    recentLabelByRequestId.delete(oldest.value);
  }
}

function applyTaskActivity(entry: WorkProgressEntry, activity: ActivityEvent): void {
  entry.taskStates.set(activity.activityId, activity.state);
  if (activity.state === "started") {
    entry.currentTask = { taskId: activity.activityId, label: activity.label, state: activity.state };
  } else if (entry.currentTask?.taskId === activity.activityId) {
    entry.currentTask = { ...entry.currentTask, state: activity.state };
  }
}

function handleActivity(activity: ActivityEvent): void {
  const sessionId = activity.source === "worker" && activity.requestId
    ? sessionIdByRequestId.get(activity.requestId)
    : undefined;
  const entry = sessionId ? entries.get(sessionId) : undefined;
  if (entry && activity.activityId) {
    applyTaskActivity(entry, activity);
    scheduleNotify();
  }
}

function ensureActivitySubscription(): void {
  stopActivity ??= subscribeActivity(handleActivity);
}

function releaseActivitySubscriptionWhenUnused(): void {
  if (entries.size === 0 && listeners.size === 0) {
    stopActivity?.();
    stopActivity = undefined;
  }
}

function attachRequestTo(entry: WorkProgressEntry, requestId: string): void {
  if (requestId) {
    sessionIdByRequestId.set(requestId, entry.sessionId);
    rememberLabel(requestId, describeWorkProgress(entry));
  }
}

function refreshLabels(entry: WorkProgressEntry): void {
  sessionIdByRequestId.forEach((sessionId, requestId) => {
    if (sessionId === entry.sessionId) {
      rememberLabel(requestId, describeWorkProgress(entry));
    }
  });
}

function disposeEntry(entry: WorkProgressEntry): void {
  if (entries.get(entry.sessionId) === entry) {
    entries.delete(entry.sessionId);
    sessionIdByRequestId.forEach((sessionId, requestId) => {
      if (sessionId === entry.sessionId) {
        sessionIdByRequestId.delete(requestId);
      }
    });
    scheduleNotify();
    releaseActivitySubscriptionWhenUnused();
  }
}

function createRegistration(entry: WorkProgressEntry): WorkProgressRegistration {
  return {
    describe: (description: WorkSessionDescription) => {
      entry.description = { ...entry.description, ...description };
      refreshLabels(entry);
      scheduleNotify();
    },
    reportPhase: (phaseKey: string, progress: WorkPhaseProgress) => {
      entry.phases.set(phaseKey, { ...progress });
      scheduleNotify();
    },
    attachRequest: (requestId: string) => attachRequestTo(entry, requestId),
    dispose: () => disposeEntry(entry),
  };
}

export function registerWorkProgress(sessionId: string, workClass: WorkClass): WorkProgressRegistration {
  const entry: WorkProgressEntry = {
    sessionId,
    description: {},
    phases: new Map(),
    startedAt: Date.now(),
    taskStates: new Map(),
    workClass,
  };
  entries.set(sessionId, entry);
  attachRequestTo(entry, sessionId);
  ensureActivitySubscription();
  scheduleNotify();
  return createRegistration(entry);
}

export function getWorkProgressSnapshots(): WorkProgressSnapshot[] {
  return snapshots();
}

export function getWorkProgressLabel(requestId: string): string | undefined {
  return recentLabelByRequestId.get(requestId);
}

export function subscribeWorkProgress(listener: WorkProgressListener): () => void {
  listeners.add(listener);
  ensureActivitySubscription();
  listener(snapshots());
  return () => {
    listeners.delete(listener);
    releaseActivitySubscriptionWhenUnused();
  };
}
