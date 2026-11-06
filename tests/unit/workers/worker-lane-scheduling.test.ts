import assert from "node:assert/strict";
import { test } from "node:test";
import { WORK_SCHEDULING } from "../../../src/content/foundation/workers/work-scheduling.const.ts";
import type { WorkClass } from "../../../src/content/foundation/workers/work-scheduling.types.ts";
import type { GetChildrenTask } from "../../../src/content/foundation/workers/tasks/worker-task.types.ts";
import { cleanupPoolHarness, createPoolHarness, until } from "./worker-pool-harness.ts";

const HOST = 101;
const OTHER_HOST = 102;

function task(taskId: string, workClass?: WorkClass, requestId = taskId): GetChildrenTask {
  return { requestId, taskId, type: "get-children", url: "https://sitecore.example/editor", workClass };
}

void test("real pool gives queued foreground FIFO priority and resumes background without preemption", async () => {
  const { pool, env } = await createPoolHarness(1);
  try {
    const first = task("background-running", WORK_SCHEDULING.BACKGROUND);
    const running = pool.runPoolTask(first, HOST);
    await until(() => env.executions.length === 1);
    const background = pool.runPoolTask(task("background-waiting", WORK_SCHEDULING.BACKGROUND), HOST);
    const foreground = pool.runPoolTask(task("foreground-default"), HOST);
    const foregroundSecond = pool.runPoolTask(task("foreground-second", WORK_SCHEDULING.FOREGROUND), HOST);
    await until(() => pool.getWorkerPoolStatus(HOST).queuedForeground === 2);
    assert.equal(env.executions.length, 1);
    assert.equal(pool.getWorkerPoolStatus(HOST).activeBackground, 1);
    env.executions[0].result.resolve({ ...first, status: "success", payload: { childItems: [] } });
    await running;
    await until(() => env.executions.length === 2);
    assert.equal(env.executions[1].task.taskId, "foreground-default");
    assert.equal(env.executions[1].task.workClass, WORK_SCHEDULING.FOREGROUND);
    env.executions[1].result.resolve({ ...env.executions[1].task, status: "cancelled" });
    await foreground;
    await until(() => env.executions.length === 3);
    assert.equal(env.executions[2].task.taskId, "foreground-second");
    env.executions[2].result.resolve({ ...env.executions[2].task, status: "cancelled" });
    await foregroundSecond;
    await until(() => env.executions.length === 4);
    assert.equal(env.executions[3].task.taskId, "background-waiting");
    env.executions[3].result.resolve({ ...env.executions[3].task, status: "cancelled" });
    await background;
  } finally {
    await cleanupPoolHarness(pool, env);
  }
});

void test("background max one includes starting jobs while foreground uses spare workers", async () => {
  const { pool, env } = await createPoolHarness(3, true);
  try {
    const background = pool.runPoolTask(task("bg-1", WORK_SCHEDULING.BACKGROUND), HOST);
    const waiting = pool.runPoolTask(task("bg-2", WORK_SCHEDULING.BACKGROUND), HOST);
    const foreground = pool.runPoolTask(task("fg"), HOST);
    await until(() => env.creations.length === 2);
    const status = pool.getWorkerPoolStatus(HOST);
    assert.equal(status.activeBackground, WORK_SCHEDULING.MAX_BACKGROUND_ACTIVE);
    assert.equal(status.activeForeground, 1);
    assert.equal(status.queuedBackground, 1);
    assert.equal(status.workerCount, 2);
    assert.equal(status.capacity, 1);
    assert.ok(status.activeTasks.every((entry) => entry.phase === WORK_SCHEDULING.PHASE.STARTING));
    pool.cancelPoolRequest("bg-1", HOST);
    env.creations[0].ready.resolve({ kind: "iframe", hostTabId: HOST, frameId: 1, workerId: "cancelled-start" });
    await background;
    await until(() => env.creations.length === 3);
    assert.equal(pool.getWorkerPoolStatus(HOST).activeBackground, 1);
    pool.cancelPoolRequest("bg-2", HOST);
    pool.cancelPoolRequest("fg", HOST);
    env.creations[1].ready.resolve({ kind: "iframe", hostTabId: HOST, frameId: 2, workerId: "foreground-start" });
    env.creations[2].ready.resolve({ kind: "iframe", hostTabId: HOST, frameId: 3, workerId: "background-start" });
    await Promise.all([waiting, foreground]);
  } finally {
    await cleanupPoolHarness(pool, env);
  }
});

for (const retryResult of ["document-stale", "missing-result"] as const) {
  void test(`real ${retryResult} retry respects foreground priority, worker capacity and background reservation`, async () => {
    const { pool, env } = await createPoolHarness(1);
    try {
      const backgroundTask = task("bg-retry", WORK_SCHEDULING.BACKGROUND);
      const background = pool.runPoolTask(backgroundTask, HOST);
      await until(() => env.executions.length === 1);
      const waiting = pool.runPoolTask(task("bg-wait", WORK_SCHEDULING.BACKGROUND), HOST);
      const foreground = pool.runPoolTask(task("fg-priority"), HOST);
      await until(() => pool.getWorkerPoolStatus(HOST).queuedForeground === 1);
      env.executions[0].result.resolve(retryResult === "document-stale" ? { ...backgroundTask, status: "document-stale" } : undefined);
      await until(() => env.executions.length === 2);
      assert.equal(env.executions[1].task.taskId, "fg-priority");
      const retryStatus = pool.getWorkerPoolStatus(HOST);
      assert.equal(retryStatus.activeBackground, 1);
      assert.equal(retryStatus.activeForeground, 1);
      assert.equal(retryStatus.workerCount, 1);
      assert.equal(retryStatus.queuedBackground, 1);
      assert.equal(retryStatus.activeTasks.find((entry) => entry.taskId === "bg-retry")?.phase, WORK_SCHEDULING.PHASE.RETRYING);
      env.executions[1].result.resolve({ ...env.executions[1].task, status: "cancelled" });
      await foreground;
      await until(() => env.executions.length === 3);
      assert.equal(env.executions[2].task.taskId, "bg-retry");
      env.executions[2].result.resolve({ ...backgroundTask, status: "cancelled" });
      await background;
      await until(() => env.executions.length === 4);
      assert.equal(env.executions[3].task.taskId, "bg-wait");
      env.executions[3].result.resolve({ ...env.executions[3].task, status: "cancelled" });
      await waiting;
    } finally {
      await cleanupPoolHarness(pool, env);
    }
  });
}

void test("snapshots separate hosts and requests, detach metadata, and host disposal preserves other readiness", async () => {
  const { pool, env } = await createPoolHarness(1);
  try {
    const first = pool.runPoolTask(task("host-one", WORK_SCHEDULING.BACKGROUND, "request-one"), HOST);
    const second = pool.runPoolTask({
      requestId: "request-two", taskId: "host-two", type: "get-quick-info",
      requested: { kind: "id", value: "item-two" }, url: "https://other.example/editor",
    }, OTHER_HOST);
    const queued = pool.runPoolTask(task("queued-one", undefined, "request-queued"), HOST);
    await until(() => env.executions.length === 2 && pool.getWorkerPoolStatus(HOST).queuedForeground === 1);
    assert.equal(pool.getWorkerPoolStatus(HOST).activeBackground, 1);
    assert.equal(pool.getWorkerPoolStatus(OTHER_HOST).activeForeground, 1);
    assert.equal(pool.getWorkerPoolStatus(HOST, "request-two").activeTasks.length, 0);
    assert.equal(pool.getWorkerPoolStatus(HOST, "request-queued").queuedForeground, 1);
    const snapshot = pool.getWorkerPoolStatus(OTHER_HOST, "request-two");
    assert.equal(snapshot.activeTasks[0].item?.value, "item-two");
    snapshot.activeTasks[0].item.value = "changed";
    assert.equal(pool.getWorkerPoolStatus(OTHER_HOST).activeTasks[0].item?.value, "item-two");
    pool.markWorkerReady(999);
    await pool.disposeWorkerPool(HOST);
    await pool.waitForWorkerReady(999, 100);
    assert.equal((await first).status, "cancelled");
    assert.equal((await queued).status, "cancelled");
    assert.equal(pool.getWorkerPoolStatus(HOST).workerCount, 0);
    assert.equal(pool.getWorkerPoolStatus(OTHER_HOST).activeForeground, 1);
    env.executions.find((entry) => entry.task.taskId === "host-two")!.result.resolve({
      requestId: "request-two", taskId: "host-two", type: "get-quick-info", status: "cancelled",
    });
    await second;
  } finally {
    await cleanupPoolHarness(pool, env);
  }
});