// @source-path [fobles] tests/unit/reference-graph-lifecycle/reference-harvesting-queue.test.ts

import { test } from "node:test";
import assert from "node:assert/strict";
import { createReferenceHarvestingQueue } from "../../../src/content/foundation/reference-data/processing/reference-harvesting-queue.ts";

void test("deduplicates normalized item and fact jobs", async () => {
  const runs: string[] = [];
  const queue = createReferenceHarvestingQueue({ runJob: (job) => { runs.push(`${job.item.kind}:${job.item.value}:${job.factName}`); return Promise.resolve(); } });
  queue.enqueue({ item: { kind: "id", value: "{ABC}" }, factName: "quickInfo" });
  queue.enqueue({ item: { kind: "id", value: "abc" }, factName: "quickInfo" });
  queue.enqueue({ item: { kind: "id", value: "abc" }, factName: "children" });
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.equal(runs.length, 2);
});

void test("accepts locator jobs discovered while processing", async () => {
  const runs: string[] = [];
  const queue = createReferenceHarvestingQueue({
    runJob: (job) => {
      runs.push(job.factName);
      if (job.factName === "children") queue.enqueue({ item: { kind: "path", value: "/sitecore/content/Home" }, factName: "quickInfo" });
      return Promise.resolve();
    },
  });
  queue.enqueue({ item: { kind: "id", value: "abc" }, factName: "children" });
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.deepEqual(runs, ["children", "quickInfo"]);
});
