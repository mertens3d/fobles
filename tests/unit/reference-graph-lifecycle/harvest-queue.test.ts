// @source-path [fobles] tests/unit/reference-graph-lifecycle/harvest-queue.test.ts

import { test } from "node:test";
import assert from "node:assert/strict";
import { createHarvestQueue } from "../../../src/content/features/reference-graph/lifecycle/harvest-queue.ts";
import {
  enqueueHarvest,
  setActiveHarvestQueue,
} from "../../../src/content/features/reference-graph/lifecycle/active-harvest-queue.ts";
import type { PhaseProgress } from "../../../src/content/features/reference-graph/lifecycle/lifecycle.types";

void test("validation can introduce work into the harvest queue", () => {
  const enqueued: string[] = [];

  setActiveHarvestQueue({
    enqueue: (reference) => enqueued.push(reference),
    dispose: () => undefined,
  });

  enqueueHarvest("46004574-866d-4702-828e-1c95ad1e03aa");
  setActiveHarvestQueue(undefined);

  assert.deepEqual(enqueued, ["46004574-866d-4702-828e-1c95ad1e03aa"]);
});

void test("enqueue deduplicates an already-queued item", async () => {
  let runCount = 0;

  const queue = createHarvestQueue({
    runHarvest: () => {
      runCount += 1;
      return Promise.resolve();
    },
  });

  queue.enqueue("item-1");
  queue.enqueue("item-1");
  queue.enqueue("item-1");

  await new Promise((resolve) => setTimeout(resolve, 10));

  assert.equal(runCount, 1);
});

void test("progress reports completed/max as items settle", async () => {
  const progressEvents: PhaseProgress[] = [];
  let resolveSecond: (() => void) | undefined;

  const queue = createHarvestQueue({
    runHarvest: async (reference) => {
      if (reference === "item-2") {
        await new Promise<void>((resolve) => {
          resolveSecond = resolve;
        });
      }
    },
    onProgress: (progress) => progressEvents.push(progress),
  });

  queue.enqueue("item-1");
  await new Promise((resolve) => setTimeout(resolve, 10));
  queue.enqueue("item-2");
  await new Promise((resolve) => setTimeout(resolve, 10));

  assert.ok(progressEvents.some((progress) => progress.completed === 1 && progress.max === 2));

  resolveSecond?.();
  await new Promise((resolve) => setTimeout(resolve, 10));

  assert.ok(progressEvents.some((progress) => progress.completed === 2 && progress.max === 2 && progress.status === "complete"));
});

void test("cancellation during harvesting aborts the signal passed to in-flight work", async () => {
  let observedAborted: boolean | undefined;
  let release: (() => void) | undefined;

  const queue = createHarvestQueue({
    runHarvest: async (_reference, signal) => {
      await new Promise<void>((resolve) => {
        release = resolve;
      });
      observedAborted = signal.aborted;
    },
  });

  queue.enqueue("item-1");
  queue.dispose();
  release?.();

  await new Promise((resolve) => setTimeout(resolve, 10));

  assert.equal(observedAborted, true);
});

void test("enqueue after dispose is a no-op", async () => {
  let runCount = 0;

  const queue = createHarvestQueue({
    runHarvest: () => {
      runCount += 1;
      return Promise.resolve();
    },
  });

  queue.dispose();
  queue.enqueue("item-1");

  await new Promise((resolve) => setTimeout(resolve, 10));

  assert.equal(runCount, 0);
});

void test("a successful re-harvest reports onSettled(true), driving Refresh -> Check", async () => {
  const queue = createHarvestQueue({
    runHarvest: () => Promise.resolve(),
  });

  const settled: boolean[] = [];
  queue.enqueue("item-1", (succeeded) => settled.push(succeeded));

  await new Promise((resolve) => setTimeout(resolve, 10));

  assert.deepEqual(settled, [true]);
});

void test("a failed re-harvest reports onSettled(false)", async () => {
  const queue = createHarvestQueue({
    runHarvest: () => Promise.reject(new Error("boom")),
    onError: () => undefined,
  });

  const settled: boolean[] = [];
  queue.enqueue("item-1", (succeeded) => settled.push(succeeded));

  await new Promise((resolve) => setTimeout(resolve, 10));

  assert.deepEqual(settled, [false]);
});
