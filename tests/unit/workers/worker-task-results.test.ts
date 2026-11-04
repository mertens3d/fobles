// @source-path [fobles] tests/unit/workers/worker-task-results.test.ts

import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createCancelledResult,
  createDocumentStaleResult,
  createErrorResult,
  isDocumentStaleResult,
  isSuccessResult,
  type GetChildrenTask,
} from "../../../src/content/foundation/workers/tasks/worker-task.types.ts";

const task = {
  requestId: "request-1",
  taskId: "task-1",
  type: "get-children",
  url: "https://sitecore.example/editor",
} satisfies GetChildrenTask;

void test("creates error and cancelled results with the task identity", () => {
  assert.deepEqual(createErrorResult(task, "worker failed"), {
    requestId: "request-1",
    taskId: "task-1",
    type: "get-children",
    status: "error",
    errorMessage: "worker failed",
  });
  assert.deepEqual(createCancelledResult(task), {
    requestId: "request-1",
    taskId: "task-1",
    type: "get-children",
    status: "cancelled",
  });
});

void test("creates and identifies a document-stale result", () => {
  const result = createDocumentStaleResult(task);

  assert.deepEqual(result, {
    requestId: "request-1",
    taskId: "task-1",
    type: "get-children",
    status: "document-stale",
  });
  assert.equal(isDocumentStaleResult(result), true);
  assert.equal(isDocumentStaleResult(createErrorResult(task, "failed")), false);
});

void test("identifies only successful worker results", () => {
  const success = {
    requestId: task.requestId,
    taskId: task.taskId,
    type: task.type,
    status: "success",
    payload: { childItems: [] },
  } as const;

  assert.equal(isSuccessResult(success), true);
  assert.equal(isSuccessResult(createCancelledResult(task)), false);
  assert.equal(isSuccessResult(createErrorResult(task, "failed")), false);
});
