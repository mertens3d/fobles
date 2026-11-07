import assert from "node:assert/strict";
import { test } from "node:test";
import { readTemplateBasesWithLease } from "../../../src/content/foundation/harvesting/coordinator/read-template-bases-with-lease.ts";
import { TEMPLATE_BASES_RESTORATION_ERROR_CODE } from "../../../src/content/foundation/harvesting/coordinator/template-bases-lease.const.ts";
import { STRUCTURAL } from "../../../src/shared/structural/structural.const.ts";
import type { WorkSession, WorkSessionTask } from "../../../src/content/foundation/workers/session/work-session.types.ts";
import type { WorkerTaskResult } from "../../../src/content/foundation/workers/tasks/worker-task.types.ts";
import { guid, SCOPE } from "./structural-fixture.ts";

void test("Raw Values fallback owns the existing harvesting lease and restores both original Raw states without touching Standard Fields", async () => {
  for (const original of [false, true]) {
    let raw = original;
    let leased = false;
    let captures = 0;
    const tasks: WorkSessionTask[] = [];
    const session = {
      runTask: (task: WorkSessionTask): Promise<WorkerTaskResult> => {
        assert.ok(leased);
        tasks.push(task);
        const base = { requestId: "test", taskId: task.taskId, status: "success" as const };
        if (task.type === "set-raw-values") {
          raw = task.value;
          return Promise.resolve({ ...base, type: task.type, payload: { value: task.value } });
        }
        assert.equal(task.type, "get-template-bases");
        assert.equal(raw, true);
        return Promise.resolve({ ...base, type: "get-template-bases", payload: { inheritedTemplateIds: [] } });
      },
    } as WorkSession;
    const result = await readTemplateBasesWithLease(session, { kind: "id", value: guid(10) }, `${SCOPE.origin}/sitecore/shell`, {
      getRawValues: () => {
        assert.ok(leased);
        captures += 1;
        return Promise.resolve(raw);
      },
      withLease: async (run) => {
        leased = true;
        try {
          return await run();
        } finally {
          leased = false;
        }
      },
    });
    assert.equal(result?.status, "success");
    assert.equal(raw, original);
    assert.equal(captures, 1);
    assert.ok(tasks.every((task) => task.type !== "set-standard-fields"));
    assert.deepEqual(tasks.map((task) => task.type), ["set-raw-values", "get-template-bases", "set-raw-values"]);
  }
});

void test("failed targeted reads still restore Raw Values and release the lease", async () => {
  let raw = false;
  let leased = false;
  const session = {
    runTask: (task: WorkSessionTask): Promise<WorkerTaskResult> => {
      if (task.type === "get-template-bases") {
        return Promise.reject(new Error("read failed"));
      }
      assert.equal(task.type, "set-raw-values");
      raw = task.type === "set-raw-values" && task.value;
      return Promise.resolve({ requestId: "test", taskId: task.taskId, type: "set-raw-values", status: "success", payload: { value: raw } });
    },
  } as WorkSession;
  await assert.rejects(readTemplateBasesWithLease(session, { kind: "id", value: guid(10) }, `${SCOPE.origin}/sitecore/shell`, {
    getRawValues: () => Promise.resolve(raw),
    withLease: async (run) => {
      leased = true;
      try {
        return await run();
      } finally {
        leased = false;
      }
    },
  }), /read failed/);
  assert.equal(raw, false);
  assert.equal(leased, false);
});

void test("restoration retries are bounded and unrecoverable restoration fails visibly after lease release", async () => {
  let leased = false;
  let restoreAttempts = 0;
  const session = {
    runTask: (task: WorkSessionTask): Promise<WorkerTaskResult> => {
      const base = { requestId: "test", taskId: task.taskId };
      let result: WorkerTaskResult;
      if (task.type === "set-raw-values" && !task.value) {
        restoreAttempts += 1;
        result = { ...base, type: task.type, status: "error", errorMessage: "restore failed" };
      } else if (task.type === "get-template-bases") {
        result = { ...base, type: task.type, status: "success", payload: { inheritedTemplateIds: [] } };
      } else {
        result = { ...base, type: "set-raw-values", status: "success", payload: { value: true } };
      }
      return Promise.resolve(result);
    },
  } as WorkSession;
  await assert.rejects(readTemplateBasesWithLease(session, { kind: "id", value: guid(10) }, `${SCOPE.origin}/sitecore/shell`, {
    getRawValues: () => Promise.resolve(false),
    withLease: async (run) => {
      leased = true;
      try {
        return await run();
      } finally {
        leased = false;
      }
    },
  }), (error: unknown) => {
    assert.ok(error instanceof Error);
    assert.equal("code" in error && error.code, TEMPLATE_BASES_RESTORATION_ERROR_CODE);
    assert.match(error.message, /Failed to restore Raw Values/);
    assert.ok("cause" in error && error.cause instanceof Error);
    assert.equal(leased, false);
    return true;
  });
  assert.equal(restoreAttempts, STRUCTURAL.RESTORE_ATTEMPTS);
  assert.equal(leased, false);
});

void test("restoration retries can recover without reporting a restoration failure", async () => {
  let restoreAttempts = 0;
  const session = {
    runTask: (task: WorkSessionTask): Promise<WorkerTaskResult> => {
      const base = { requestId: "test", taskId: task.taskId, status: "success" as const };
      if (task.type === "set-raw-values") {
        if (!task.value) {
          restoreAttempts += 1;
          if (restoreAttempts < STRUCTURAL.RESTORE_ATTEMPTS) {
            return Promise.reject(new Error("temporary restoration failure"));
          }
        }
        return Promise.resolve({ ...base, type: task.type, payload: { value: task.value } });
      }
      return Promise.resolve({ ...base, type: "get-template-bases", payload: { inheritedTemplateIds: [] } });
    },
  } as WorkSession;
  const result = await readTemplateBasesWithLease(session, { kind: "id", value: guid(10) }, `${SCOPE.origin}/sitecore/shell`, {
    getRawValues: () => Promise.resolve(false),
    withLease: (run) => run(),
  });
  assert.equal(result?.status, "success");
  assert.equal(restoreAttempts, STRUCTURAL.RESTORE_ATTEMPTS);
});

void test("restoration failure takes precedence over a failed read and preserves the final restoration cause", async () => {
  const restorationError = new Error("restoration rejected");
  let tasks = 0;
  const session = {
    runTask: (task: WorkSessionTask): Promise<WorkerTaskResult | undefined> => {
      tasks += 1;
      if (tasks > 1) {
        return Promise.reject(task.type === "get-template-bases" ? new Error("missing read") : restorationError);
      }
      return Promise.resolve({ requestId: "test", taskId: task.taskId, type: "set-raw-values", status: "success", payload: { value: true } });
    },
  } as WorkSession;
  await assert.rejects(readTemplateBasesWithLease(session, { kind: "id", value: guid(10) }, `${SCOPE.origin}/sitecore/shell`, {
    getRawValues: () => Promise.resolve(true),
    withLease: (run) => run(),
  }), (error: unknown) => {
    assert.ok(error instanceof Error);
    assert.equal("code" in error && error.code, TEMPLATE_BASES_RESTORATION_ERROR_CODE);
    assert.equal("cause" in error && error.cause, restorationError);
    return true;
  });
  assert.equal(tasks, 2 + STRUCTURAL.RESTORE_ATTEMPTS);
});