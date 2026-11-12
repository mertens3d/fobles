import assert from "node:assert/strict";
import { test } from "node:test";
import { takeNextWorkerTask } from "../../../src/content/foundation/workers/pool/worker-admission.ts";
import { WORK_SCHEDULING } from "../../../src/content/foundation/workers/work-scheduling.const.ts";
import type { QueuedTask, PoolWorker } from "../../../src/content/foundation/workers/tasks/worker-task.types.ts";
import type { WorkerPoolState } from "../../../src/content/foundation/workers/pool/pool.types.ts";

function queued(): QueuedTask {
  return {
    task: { requestId: "retry", taskId: "retry", type: "get-children", url: "https://sitecore.example/editor", workClass: WORK_SCHEDULING.BACKGROUND },
    hostTabId: 1, retried: true, editorStateChangeCount: 0, submittedAt: 0, deadlineAt: 100,
    recoveryCount: 1, resolve() {}, retryQueuedAt: 10,
  };
}

function worker(state: PoolWorker["state"]): PoolWorker {
  return {
    target: undefined, state, currentUrl: undefined, generation: 0, retirementTimer: undefined,
    lastProgressAt: 0, recoveryCount: 0, activeTaskId: undefined,
  };
}

function pool(task: QueuedTask, workers: PoolWorker[]): WorkerPoolState {
  return {
    hostTabId: 1, generation: 0, workers, queue: [task], admittedTasks: new Set([task]),
    cancelledRequestIds: new Set(), activeTaskByWorkerKey: new Map(), lastProgressAt: 0,
    recoveryCount: 0, healthTimer: undefined, idleDisposalTimer: undefined,
  };
}

void test("retry queue wait pauses execution budget without releasing its atomic lane reservation", (context) => {
  context.mock.method(performance, "now", () => 1000);
  const retry = queued();
  const state = pool(retry, [worker("busy")]);
  assert.equal(takeNextWorkerTask(state, 1), undefined);
  assert.equal(retry.deadlineAt, 100);
  assert.equal(state.admittedTasks.size, 1);
  state.workers[0].state = "idle";
  assert.equal(takeNextWorkerTask(state, 1), retry);
  assert.equal(retry.deadlineAt, 1090);
  assert.equal(retry.retryQueuedAt, undefined);
  assert.equal(state.admittedTasks.size, 1);
});

void test("an idle worker cannot bypass a reduced maximum when starting/executing slots already fill it", () => {
  const retry = queued();
  const state = pool(retry, [worker("starting"), worker("busy"), worker("idle")]);
  assert.equal(takeNextWorkerTask(state, 1), undefined);
  assert.equal(takeNextWorkerTask(state, 2), undefined);
  assert.equal(state.queue.length, 1);
  state.workers[0].state = "retired";
  assert.equal(takeNextWorkerTask(state, 2), retry);
});