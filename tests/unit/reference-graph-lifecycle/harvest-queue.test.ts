// @source-path [fobles] tests/unit/reference-graph-lifecycle/harvest-queue.test.ts

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createReferenceModelHarvestQueue,
  type ReferenceModelHarvestProgress,
} from "../../../src/content/foundation/reference-data/processing/reference-model-harvest-queue.ts";

void test("work enqueued after the queue has gone idle still runs", async () => {
  const runs: string[] = [];

  const queue = createReferenceModelHarvestQueue({
    runHarvest: (reference) => {
      runs.push(reference);
      return Promise.resolve();
    },
  });

  queue.enqueue("item-1");
  await new Promise((resolve) => setTimeout(resolve, 10));
  queue.enqueue("item-2");
  await new Promise((resolve) => setTimeout(resolve, 10));

  assert.deepEqual(runs, ["item-1", "item-2"]);
});

void test("enqueue deduplicates an already-queued item", async () => {
  let runCount = 0;

  const queue = createReferenceModelHarvestQueue({
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
  const progressEvents: ReferenceModelHarvestProgress[] = [];
  let resolveSecond: (() => void) | undefined;

  const queue = createReferenceModelHarvestQueue({
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

  const queue = createReferenceModelHarvestQueue({
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

  const queue = createReferenceModelHarvestQueue({
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
  const queue = createReferenceModelHarvestQueue({
    runHarvest: () => Promise.resolve(),
  });

  const settled: boolean[] = [];
  queue.enqueue("item-1", (succeeded) => settled.push(succeeded));

  await new Promise((resolve) => setTimeout(resolve, 10));

  assert.deepEqual(settled, [true]);
});

void test("a failed re-harvest reports onSettled(false)", async () => {
  const queue = createReferenceModelHarvestQueue({
    runHarvest: () => Promise.reject(new Error("boom")),
    onError: () => undefined,
  });

  const settled: boolean[] = [];
  queue.enqueue("item-1", (succeeded) => settled.push(succeeded));

  await new Promise((resolve) => setTimeout(resolve, 10));

  assert.deepEqual(settled, [false]);
});
