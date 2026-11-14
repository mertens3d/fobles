import assert from "node:assert/strict";
import { test } from "node:test";
import { cleanupPoolHarness, createPoolHarness, until } from "./worker-pool-harness.ts";
import { WORK_SCHEDULING } from "../../../src/content/foundation/workers/work-scheduling.const.ts";

const HOST = 201;
const URL = "https://sitecore.example/editor";

void test("failed worker startup retries through foreground admission and keeps the background atomic slot", async () => {
  const { pool, env } = await createPoolHarness(1, true);
  try {
    const backgroundTask = {
      requestId: "background", taskId: "background", type: "get-children", url: URL,
      workClass: WORK_SCHEDULING.BACKGROUND,
    } as const;
    const background = pool.runPoolTask(backgroundTask, HOST);
    await until(() => env.creations.length === 1);
    const foreground = pool.runPoolTask({ requestId: "foreground", taskId: "foreground", type: "get-children", url: URL }, HOST);
    await until(() => pool.getWorkerPoolStatus(HOST).queuedForeground === 1);
    env.creations[0].ready.reject(new Error("worker creation failed"));
    await until(() => env.creations.length === 2);
    const status = pool.getWorkerPoolStatus(HOST);
    assert.equal(status.workerCount, 2);
    assert.equal(status.capacity, 0);
    assert.equal(status.activeBackground, 1);
    assert.equal(status.activeTasks.find((entry) => entry.requestId === "foreground")?.phase, WORK_SCHEDULING.PHASE.STARTING);
    assert.equal(status.activeTasks.find((entry) => entry.requestId === "background")?.phase, WORK_SCHEDULING.PHASE.RETRYING);
    env.creations[1].ready.resolve({ kind: "iframe", hostTabId: HOST, workerId: "foreground", frameId: 1 });
    await until(() => env.executions.length === 1);
    assert.equal(env.executions[0].task.requestId, "foreground");
    env.executions[0].result.resolve({ ...env.executions[0].task, status: "cancelled" });
    await foreground;
    await until(() => env.executions.length === 2);
    assert.equal(env.executions[1].task.requestId, "background");
    env.executions[1].result.resolve({ ...backgroundTask, status: "cancelled" });
    await background;
  } finally {
    await cleanupPoolHarness(pool, env);
  }
});

void test("cancelling a starting atomic background job does not retry and releases its lane after settlement", async () => {
  const { pool, env } = await createPoolHarness(1, true);
  try {
    const result = pool.runPoolTask({
      requestId: "cancel-start", taskId: "cancel-start", type: "get-children", url: URL,
      workClass: WORK_SCHEDULING.BACKGROUND,
    }, HOST);
    await until(() => env.creations.length === 1);
    pool.cancelPoolTask("cancel-start", "cancel-start", HOST);
    env.creations[0].ready.reject(new Error("startup cancelled"));
    assert.equal((await result).status, "cancelled");
    assert.equal(env.creations.length, 1);
    assert.equal(pool.getWorkerPoolStatus(HOST).activeBackground, 0);
  } finally {
    await cleanupPoolHarness(pool, env);
  }
});