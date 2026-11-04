// @source-path [fobles] tests/unit/workers/worker-readiness.test.ts

import assert from "node:assert/strict";
import { test } from "node:test";
import {
  clearWorkerReadiness,
  markWorkerReady,
  resetWorkerReadiness,
  waitForWorkerReady,
} from "../../../src/content/foundation/workers/pool/worker-readiness.ts";

void test("consumes readiness marked before the waiter starts only once", async () => {
  clearWorkerReadiness();
  try {
    markWorkerReady(11);
    await waitForWorkerReady(11, 100);
    await assert.rejects(waitForWorkerReady(11, 1), /Worker tab 11 did not become ready in time/);
  } finally {
    clearWorkerReadiness();
  }
});

void test("resolves all current waiters for the matching tab", async () => {
  clearWorkerReadiness();
  try {
    const firstWaiter = waitForWorkerReady(21, 100);
    const secondWaiter = waitForWorkerReady(21, 100);

    markWorkerReady(21);
    await Promise.all([firstWaiter, secondWaiter]);
  } finally {
    clearWorkerReadiness();
  }
});

void test("keeps readiness isolated between worker tabs", async () => {
  clearWorkerReadiness();
  try {
    markWorkerReady(31);
    await waitForWorkerReady(31, 100);
    await assert.rejects(waitForWorkerReady(32, 1), /Worker tab 32 did not become ready in time/);
  } finally {
    clearWorkerReadiness();
  }
});

void test("removes a timed-out waiter so later readiness is stored for the next waiter", async () => {
  clearWorkerReadiness();
  try {
    await assert.rejects(waitForWorkerReady(41, 1), /Worker tab 41 did not become ready in time/);

    markWorkerReady(41);
    await waitForWorkerReady(41, 100);
  } finally {
    clearWorkerReadiness();
  }
});

void test("ignores undefined readiness and clears stored signals on reset and clear", async () => {
  clearWorkerReadiness();
  try {
    markWorkerReady(undefined);
    await assert.rejects(waitForWorkerReady(51, 1), /Worker tab 51 did not become ready in time/);

    markWorkerReady(52);
    resetWorkerReadiness(52);
    await assert.rejects(waitForWorkerReady(52, 1), /Worker tab 52 did not become ready in time/);

    markWorkerReady(53);
    clearWorkerReadiness();
    await assert.rejects(waitForWorkerReady(53, 1), /Worker tab 53 did not become ready in time/);
  } finally {
    clearWorkerReadiness();
  }
});
