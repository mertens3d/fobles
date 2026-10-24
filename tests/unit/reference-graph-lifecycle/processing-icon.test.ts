// @source-path [fobles] tests/unit/reference-graph-lifecycle/processing-icon.test.ts

import { test } from "node:test";
import assert from "node:assert/strict";
import { processingIconKeyForStatus } from "../../../src/content/features/reference-graph/graph-nodes/processing-icon.ts";

void test("pending/enriching status shows Hourglass", () => {
  assert.equal(processingIconKeyForStatus("pending"), "hourglass");
  assert.equal(processingIconKeyForStatus("enriching"), "hourglass");
});

void test("enriched/verified status shows Check", () => {
  assert.equal(processingIconKeyForStatus("enriched"), "check");
  assert.equal(processingIconKeyForStatus("verified"), "check");
});

void test("stale status shows Refresh", () => {
  assert.equal(processingIconKeyForStatus("stale"), "refresh");
});

void test("failed/unverified/not-found status shows Warning", () => {
  assert.equal(processingIconKeyForStatus("failed"), "warning");
  assert.equal(processingIconKeyForStatus("unverified"), "warning");
  assert.equal(processingIconKeyForStatus("not-found"), "warning");
});

void test("a successful re-harvest transitions a stale node's badge from Refresh to Check", () => {
  // Mirrors enrichment-controller.ts's harvest-queue onSettled handler: a stale node is marked
  // "enriched" once its re-harvest completes successfully.
  assert.equal(processingIconKeyForStatus("stale"), "refresh");
  assert.equal(processingIconKeyForStatus("enriched"), "check");
});

void test("undefined status shows no badge", () => {
  assert.equal(processingIconKeyForStatus(undefined), undefined);
});
