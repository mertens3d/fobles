// @source-path [fobles] tests/unit/reference-graph-lifecycle/processing-icon.test.ts

import { test } from "node:test";
import assert from "node:assert/strict";
import { iconForProcessingState } from "../../../src/content/features/reference-graph/graph-nodes/processing-icon.ts";
import { CONST } from "../../../src/constants/const.ts";

const ITEM_ICON = "/~/icon/some/16x16/item.png";
const ICONS = CONST.SITECORE.ICONS.PROCESSING_STATE;

void test("pending/enriching status shows Hourglass", () => {
  assert.equal(iconForProcessingState("pending", ITEM_ICON), ICONS.HOURGLASS);
  assert.equal(iconForProcessingState("enriching", ITEM_ICON), ICONS.HOURGLASS);
});

void test("enriched/verified status shows the item's own icon unchanged (no badge)", () => {
  assert.equal(iconForProcessingState("enriched", ITEM_ICON), ITEM_ICON);
  assert.equal(iconForProcessingState("verified", ITEM_ICON), ITEM_ICON);
});

void test("stale status shows Refresh", () => {
  assert.equal(iconForProcessingState("stale", ITEM_ICON), ICONS.REFRESH);
});

void test("failed/unverified/not-found status shows Warning", () => {
  assert.equal(iconForProcessingState("failed", ITEM_ICON), ICONS.WARNING);
  assert.equal(iconForProcessingState("unverified", ITEM_ICON), ICONS.WARNING);
  assert.equal(iconForProcessingState("not-found", ITEM_ICON), ICONS.WARNING);
});

void test("a successful re-harvest transitions a stale node's badge from Refresh back to the item's own icon", () => {
  // Mirrors enrichment-controller.ts's harvest-queue onSettled handler: a stale node is marked
  // "enriched" once its re-harvest completes successfully.
  assert.equal(iconForProcessingState("stale", ITEM_ICON), ICONS.REFRESH);
  assert.equal(iconForProcessingState("enriched", ITEM_ICON), ITEM_ICON);
});

void test("undefined status shows the item's own icon unchanged", () => {
  assert.equal(iconForProcessingState(undefined, ITEM_ICON), ITEM_ICON);
});
