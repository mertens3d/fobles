import assert from "node:assert/strict";
import { test } from "node:test";
import { WORK_SCHEDULING } from "../../../src/content/foundation/workers/work-scheduling.const.ts";
import type { WorkerTaskResult } from "../../../src/content/foundation/workers/tasks/worker-task.types.ts";
import { createSessionHarness } from "./work-session-harness.ts";
import { deferred, until } from "./worker-pool-harness.ts";

const TASK = { taskId: "task", type: "get-children", url: "https://sitecore.example/editor" } as const;

void test("sessions default foreground, tag tasks and retain foreground leases through complete", async () => {
  const { sessions, env, restore } = await createSessionHarness();
  const foreground = sessions.createWorkSession();
  try {
    await foreground.runTask(TASK);
    assert.equal(foreground.workClass, WORK_SCHEDULING.FOREGROUND);
    assert.equal(env.tasks[0].workClass, WORK_SCHEDULING.FOREGROUND);
    assert.equal(env.tasks[0].requestId, foreground.id);
    await foreground.complete();
    assert.equal(foreground.state, "completed");
    assert.equal(env.disposalCount, 0);
    await foreground.cancel();
    assert.equal(env.disposalCount, 1);
  } finally {
    await foreground.cancel();
    restore();
  }
});

void test("foreground close cannot sweep an existing background lease, and background complete cancels/releases it", async () => {
  const { sessions, env, restore } = await createSessionHarness();
  const foreground = sessions.createWorkSession();
  const background = sessions.createWorkSession(WORK_SCHEDULING.BACKGROUND);
  try {
    await background.runTask(TASK);
    assert.equal(env.tasks[0].workClass, WORK_SCHEDULING.BACKGROUND);
    await foreground.cancel();
    assert.equal(env.disposalCount, 0);
    assert.equal(env.cleanupCount, 0);
    assert.equal(background.state, "open");
    assert.deepEqual(env.cancelled, [foreground.id]);
    await background.complete();
    assert.equal(background.state, "released");
    assert.equal(background.signal.aborted, true);
    assert.deepEqual(env.cancelled, [foreground.id, background.id]);
    assert.equal(env.disposalCount, 1);
    await background.cancel();
    assert.equal(env.disposalCount, 1);
  } finally {
    await foreground.cancel();
    await background.cancel();
    restore();
  }
});

void test("watchdog does not cancel a queued background session but still cancels stalled foreground", async (context) => {
  const { sessions, env, restore } = await createSessionHarness();
  let now = 0;
  context.mock.method(performance, "now", () => now);
  context.mock.timers.enable({ apis: ["setInterval"] });
  const pending = deferred<WorkerTaskResult | undefined>();
  env.pending = pending.promise;
  const foreground = sessions.createWorkSession();
  const background = sessions.createWorkSession(WORK_SCHEDULING.BACKGROUND);
  const backgroundTask = background.runTask(TASK);
  const foregroundTask = foreground.runTask(TASK);
  try {
    await until(() => env.tasks.length === 2);
    now = 100;
    context.mock.timers.tick(100);
    await until(() => foreground.signal.aborted);
    assert.equal(background.state, "open");
    assert.equal(background.signal.aborted, false);
    assert.equal(background.getHealth().state, "healthy");
    assert.deepEqual(env.cancelled, [foreground.id]);
    assert.equal(env.disposalCount, 0);
    pending.resolve(undefined);
    await Promise.all([foregroundTask, backgroundTask]);
    await background.complete();
    assert.equal(env.disposalCount, 1);
  } finally {
    pending.resolve(undefined);
    await foreground.cancel();
    await background.cancel();
    restore();
  }
});