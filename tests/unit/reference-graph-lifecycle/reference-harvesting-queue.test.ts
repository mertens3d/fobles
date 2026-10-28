// @source-path [fobles] tests/unit/reference-graph-lifecycle/reference-harvesting-queue.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { createReferenceHarvestingQueue } from "../../../src/content/foundation/reference-data/processing/reference-harvesting-queue.ts";
void test("deduplicates by item and fact while allowing another fact for the same item", async () => {
    const runs: string[] = [];
    const queue = createReferenceHarvestingQueue({ runJob: (job) => { runs.push(`${job.reference}:${job.factName}`); return Promise.resolve(); } });
    queue.enqueue({ reference: "item-1", factName: "children" });
    queue.enqueue({ reference: "item-1", factName: "children" });
    queue.enqueue({ reference: "item-1", factName: "referrers" });
    await new Promise((resolve) => setTimeout(resolve, 10));
    assert.deepEqual(runs, ["item-1:children", "item-1:referrers"]);
});
void test("accepts newly discovered jobs after processing has started", async () => {
    const runs: string[] = [];
    const queue = createReferenceHarvestingQueue({ runJob: async (job) => { runs.push(job.factName); if (job.factName === "children")
            queue.enqueue({ reference: "item-2", factName: "quickInfo" }); } });
    queue.enqueue({ reference: "item-1", factName: "children" });
    await new Promise((resolve) => setTimeout(resolve, 10));
    assert.deepEqual(runs, ["children", "quickInfo"]);
});
