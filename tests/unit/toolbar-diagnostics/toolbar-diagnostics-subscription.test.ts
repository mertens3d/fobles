import assert from "node:assert/strict";
import { test } from "node:test";
import { observeToolbarDiagnostics } from "../../../src/content/toolbar/diagnostics/toolbar-diagnostics-subscription.ts";
import type { ToolbarDiagnosticsServices, ToolbarDiagnosticsState } from "../../../src/content/toolbar/diagnostics/toolbar-diagnostics.types.ts";
import type { ActivityListener } from "../../../src/content/shared/activity/activity.types.ts";
import type { StructuralSettings } from "../../../src/shared/structural/structural.types.ts";
import { snapshotWorkerPoolStatus } from "../../../src/content/foundation/workers/pool/worker-pool-status.ts";
import type { WorkerPoolStatus, WorkerPoolState } from "../../../src/content/foundation/workers/pool/pool.types.ts";
import type { QueuedTask } from "../../../src/content/foundation/workers/tasks/tasks.types.ts";

const settings: StructuralSettings = { baseTemplatePaths: { page: [], site: [], tenant: [] } };

function status(hostTabId: number, activeBackground = 0): WorkerPoolStatus {
  return { hostTabId, activeBackground, activeForeground: 0, activeTasks: [], capacity: 2,
    maxBackgroundActive: 1, maxWorkers: 2, queuedBackground: 0, queuedForeground: 0, queuedTasks: [], workerCount: 0 };
}

void test("live settings beat a late initial read; live scoped status beats a late snapshot", async () => {
  let resolveSettings!: (value: StructuralSettings) => void;
  let resolveStatus!: (value: WorkerPoolStatus) => void;
  let changeSettings!: (value: StructuralSettings) => void;
  let activity!: ActivityListener;
  const states: ToolbarDiagnosticsState[] = [];
  const services: ToolbarDiagnosticsServices = {
    getSettings: () => new Promise((resolve) => { resolveSettings = resolve; }),
    getStatus: () => new Promise((resolve) => { resolveStatus = resolve; }),
    subscribe: (listener) => {
      activity = listener;
      return () => undefined;
    },
    watchSettings: (listener) => {
      changeSettings = listener;
      return () => undefined;
    },
  };
  const stop = observeToolbarDiagnostics(services, (state) => states.push(state));
  try {
    changeSettings({ ...settings, showToolbarDiagnostics: true });
    resolveSettings(settings);
    await Promise.resolve();
    assert.equal(states[states.length - 1].enabled, true);
    for (const snapshot of [status(101, 1), status(999, 9)]) {
      activity({ activityId: "pool", kind: "pool", label: "Pool", source: "worker-pool", state: "completed",
        timestamp: 0, poolStatus: snapshot });
    }
    resolveStatus(status(101));
    await Promise.resolve();
    assert.equal(states[states.length - 1].status?.hostTabId, 101);
    assert.equal(states[states.length - 1].status?.activeBackground, 1);
    changeSettings({ ...settings, showToolbarDiagnostics: false });
    assert.deepEqual(states[states.length - 1], { enabled: false });
  } finally {
    stop();
  }
});

void test("disable and disposal reject late initial status and activity callbacks", async () => {
  let resolveStatus!: (value: WorkerPoolStatus) => void;
  let changeSettings!: (value: StructuralSettings) => void;
  let activity!: ActivityListener;
  let subscriptionsRemoved = 0;
  const states: ToolbarDiagnosticsState[] = [];
  const stop = observeToolbarDiagnostics({
    getSettings: () => Promise.resolve({ ...settings, showToolbarDiagnostics: true }),
    getStatus: () => new Promise((resolve) => { resolveStatus = resolve; }),
    subscribe: (listener) => {
      activity = listener;
      return () => {
        subscriptionsRemoved++;
      };
    },
    watchSettings: (listener) => {
      changeSettings = listener;
      return () => {
        subscriptionsRemoved++;
      };
    },
  }, (state) => states.push(state));
  await Promise.resolve();
  changeSettings(settings);
  resolveStatus(status(101, 1));
  await Promise.resolve();
  assert.deepEqual(states[states.length - 1], { enabled: false });
  stop();
  const count = states.length;
  activity({ activityId: "pool", kind: "pool", label: "Pool", source: "worker-pool", state: "completed",
    timestamp: 0, poolStatus: status(101, 1) });
  changeSettings({ ...settings, showToolbarDiagnostics: true });
  assert.equal(states.length, count);
  assert.equal(subscriptionsRemoved, 2);
});

void test("template-base snapshots preserve the requested item in queued and active phases", () => {
  const queued: QueuedTask = {
    task: { requestId: "structural", taskId: "bases", type: "get-template-bases", url: "https://sitecore.example/editor",
      requested: { kind: "id", value: "template-guid" }, workClass: "background" },
    hostTabId: 101, retried: false, editorStateChangeCount: 0, submittedAt: 0, deadlineAt: 1,
    recoveryCount: 0, resolve: () => undefined,
  };
  const pool = { generation: 1, workers: [], queue: [queued], admittedTasks: new Set<QueuedTask>() } as unknown as WorkerPoolState;
  const waiting = snapshotWorkerPoolStatus(pool, 101, 2).queuedTasks[0];
  assert.deepEqual(waiting.item, { kind: "id", value: "template-guid" });
  assert.equal(waiting.phase, "queued");
  pool.admittedTasks.add(queued);
  const active = snapshotWorkerPoolStatus(pool, 101, 2).activeTasks[0];
  assert.deepEqual(active.item, waiting.item);
  assert.equal(active.phase, "retrying");
});