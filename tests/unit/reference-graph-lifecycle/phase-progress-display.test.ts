// @source-path [fobles] tests/unit/reference-graph-lifecycle/phase-progress-display.test.ts

import { test } from "node:test";
import assert from "node:assert/strict";
import { computePhaseProgressDisplay, isLifecycleProgressActive } from "../../../src/content/shared/ui/reference-controls/phase-progress-display.ts";

void test("0 / 0 (no work) renders as 100% complete", () => {
  const display = computePhaseProgressDisplay({ completed: 0, max: 0, status: "complete" });
  assert.deepEqual(display, { completed: 0, max: 0, percent: 100 });
});

void test("undefined progress (phase never started) renders as 100% complete", () => {
  const display = computePhaseProgressDisplay(undefined);
  assert.deepEqual(display, { completed: 0, max: 0, percent: 100 });
});

void test("0 / N (work exists, none completed) renders 0%", () => {
  const display = computePhaseProgressDisplay({ completed: 0, max: 4, status: "running" });
  assert.deepEqual(display, { completed: 0, max: 4, percent: 0 });
});

void test("N / N (complete) renders 100%", () => {
  const display = computePhaseProgressDisplay({ completed: 4, max: 4, status: "complete" });
  assert.deepEqual(display, { completed: 4, max: 4, percent: 100 });
});

void test("partial completion renders a proportional percentage", () => {
  const display = computePhaseProgressDisplay({ completed: 1, max: 4, status: "running" });
  assert.deepEqual(display, { completed: 1, max: 4, percent: 25 });
});

void test("active Resolve only (Harvest never had work) keeps the progress section visible", () => {
  const active = isLifecycleProgressActive(undefined, { completed: 5, max: 14, status: "running" });
  assert.equal(active, true);
});

void test("Harvest dynamically receiving work keeps the progress section visible", () => {
  const active = isLifecycleProgressActive(
    { completed: 1, max: 3, status: "running" },
    { completed: 9, max: 14, status: "running" },
  );
  assert.equal(active, true);
});

void test("both phases complete hides the progress section", () => {
  const active = isLifecycleProgressActive(
    { completed: 3, max: 3, status: "complete" },
    { completed: 14, max: 14, status: "complete" },
  );
  assert.equal(active, false);
});

void test("both phases never having had any work hides the progress section", () => {
  const active = isLifecycleProgressActive(undefined, undefined);
  assert.equal(active, false);
});

void test("one phase complete but the other still running keeps the section visible", () => {
  const active = isLifecycleProgressActive(
    { completed: 3, max: 3, status: "complete" },
    { completed: 9, max: 14, status: "running" },
  );
  assert.equal(active, true);
});
