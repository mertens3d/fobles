import assert from "node:assert/strict";
import { test } from "node:test";
import { WORK_SCHEDULING } from "../../../src/content/foundation/workers/work-scheduling.const.ts";
import { cleanupPoolHarness, createPoolHarness, until } from "./worker-pool-harness.ts";
import { backgroundCooldownRemaining, cancelBackgroundCooldown, scheduleBackgroundCooldown } from "../../../src/content/foundation/workers/pool/worker-background-cooldown.ts";
import { takeNextWorkerTask } from "../../../src/content/foundation/workers/pool/worker-admission.ts";
import type { WorkerPoolState } from "../../../src/content/foundation/workers/pool/pool.types.ts";
import type { GetChildrenTask, QueuedTask } from "../../../src/content/foundation/workers/tasks/tasks.types.ts";

const HOST = 201;
const task = (id: string, background = true): GetChildrenTask => ({
  requestId: id, taskId: id, type: "get-children", url: "https://sitecore.example/editor",
  workClass: background ? WORK_SCHEDULING.BACKGROUND : WORK_SCHEDULING.FOREGROUND,
});

void test("cooldown admits at the exact boundary, preserves retry reservation, and excludes queue time from budget", (t) => {
  let now = 100;
  t.mock.method(performance, "now", () => now);
  const waiting: QueuedTask = {
    task: task("waiting"), hostTabId: HOST, retried: false, editorStateChangeCount: 0,
    submittedAt: 0, deadlineAt: 20, recoveryCount: 0, resolve() {},
  };
  const state: WorkerPoolState = {
    hostTabId: HOST, generation: 0, workers: [], queue: [waiting], admittedTasks: new Set(),
    cancelledRequestIds: new Set(), activeTaskByWorkerKey: new Map(), lastProgressAt: 0,
    recoveryCount: 0, healthTimer: undefined, idleDisposalTimer: undefined, backgroundCompletedAt: 100,
  };
  assert.equal(takeNextWorkerTask(state, 3, 1000), undefined);
  assert.equal(state.admittedTasks.size, 0);
  now = 1099;
  assert.equal(backgroundCooldownRemaining(state, 1000), 1);
  assert.equal(takeNextWorkerTask(state, 3, 1000), undefined);
  now = 1100;
  assert.equal(takeNextWorkerTask(state, 3, 1000), waiting);
  assert.equal(waiting.deadlineAt, 1120);
  const retry = { ...waiting, retryQueuedAt: now };
  state.admittedTasks = new Set([retry]);
  state.queue = [waiting, retry];
  state.backgroundCompletedAt = now;
  now += 1;
  assert.equal(takeNextWorkerTask(state, 3, 1000), retry);
  assert.equal(state.admittedTasks.size, 1);
  assert.equal(takeNextWorkerTask(state, 3, 0), undefined);
});

void test("cooldown timers rearm once and cancellation prevents wakeups", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  t.mock.method(performance, "now", () => 100);
  const state = {
    queue: [{ task: task("waiting") }], admittedTasks: new Set(), backgroundCompletedAt: 100,
  } as WorkerPoolState;
  let wakeups = 0;
  const resume = () => {
    wakeups += 1;
  };
  scheduleBackgroundCooldown(state, 1000, resume);
  scheduleBackgroundCooldown(state, 500, resume);
  t.mock.timers.tick(499);
  assert.equal(wakeups, 0);
  t.mock.timers.tick(1);
  assert.equal(wakeups, 1);
  assert.equal(state.backgroundCooldownTimer, undefined);
  scheduleBackgroundCooldown(state, 1000, resume);
  cancelBackgroundCooldown(state);
  t.mock.timers.tick(1000);
  assert.equal(wakeups, 1);
});

void test("cooldown has no wakeup for foreground-only queues, active background reservations, or zero delay", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  t.mock.method(performance, "now", () => 100);
  const waiting = { task: task("waiting") } as QueuedTask;
  const state = {
    queue: [waiting], admittedTasks: new Set<QueuedTask>(), backgroundCompletedAt: 100,
  } as WorkerPoolState;
  let wakeups = 0;
  const resume = () => {
    wakeups += 1;
  };
  scheduleBackgroundCooldown(state, 1000, resume);
  assert.notEqual(state.backgroundCooldownTimer, undefined);
  state.admittedTasks.add(waiting);
  scheduleBackgroundCooldown(state, 1000, resume);
  assert.equal(state.backgroundCooldownTimer, undefined);
  state.admittedTasks.clear();
  state.queue = [{ task: task("foreground", false) } as QueuedTask];
  scheduleBackgroundCooldown(state, 1000, resume);
  assert.equal(state.backgroundCooldownTimer, undefined);
  state.queue = [waiting];
  scheduleBackgroundCooldown(state, 0, resume);
  assert.equal(state.backgroundCooldownTimer, undefined);
  state.queue = [];
  scheduleBackgroundCooldown(state, 1000, resume);
  t.mock.timers.tick(1000);
  assert.equal(wakeups, 0);
});

void test("real pool delays only background, wakes automatically, isolates hosts, and cleans up on disposal", async (t) => {
  const { pool, env } = await createPoolHarness(3);
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let now = 100;
  t.mock.method(performance, "now", () => now);
  env.backgroundIntertaskCooldownMs = 1000;
  try {
    const first = pool.runPoolTask(task("first"), HOST);
    await until(() => env.executions.length === 1);
    const second = pool.runPoolTask(task("second"), HOST);
    await until(() => pool.getWorkerPoolStatus(HOST).queuedBackground === 1);
    assert.equal(pool.getWorkerPoolStatus(HOST).activeBackground, 1);
    env.executions[0].result.resolve({ ...env.executions[0].task, status: "cancelled" });
    await first;
    await until(() => pool.getWorkerPoolStatus(HOST).activeBackground === 0);
    const foreground = pool.runPoolTask(task("foreground", false), HOST);
    const otherHost = pool.runPoolTask(task("other-host"), HOST + 1);
    await until(() => env.executions.length === 3);
    assert.deepEqual(env.executions.slice(1).map((entry) => entry.task.taskId).sort(), ["foreground", "other-host"]);
    now += 999;
    t.mock.timers.tick(999);
    assert.equal(env.executions.length, 3);
    now += 1;
    t.mock.timers.tick(1);
    await until(() => env.executions.length === 4);
    assert.equal(env.executions[3].task.taskId, "second");
    assert.equal(pool.getWorkerPoolStatus(HOST).activeBackground, 1);
    for (const entry of env.executions.slice(1)) {
      entry.result.resolve({ ...entry.task, status: "cancelled" });
    }
    await Promise.all([second, foreground, otherHost]);
    const pending = pool.runPoolTask(task("dispose-during-cooldown"), HOST);
    await until(() => pool.getWorkerPoolStatus(HOST).queuedBackground === 1);
    await pool.disposeWorkerPool(HOST);
    assert.equal((await pending).status, "cancelled");
    now += 1000;
    t.mock.timers.tick(1000);
    assert.equal(env.executions.length, 4);
  } finally {
    await cleanupPoolHarness(pool, env);
  }
});