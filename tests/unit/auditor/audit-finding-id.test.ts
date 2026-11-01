// @source-path [fobles] tests/unit/auditor/audit-finding-id.test.ts

import { test } from "node:test";
import assert from "node:assert/strict";
import { buildAuditFindingId } from "../../../src/content/features/auditor/audit-finding-id.ts";

void test("buildAuditFindingId joins all four fields with '::'", () => {
  assert.equal(buildAuditFindingId("check-key", "node-1", "item-1", "ctx"), "check-key::node-1::item-1::ctx");
});

void test("buildAuditFindingId renders an undefined referenceModelNodeId as an empty segment", () => {
  assert.equal(buildAuditFindingId("check-key", undefined, "item-1", "ctx"), "check-key::::item-1::ctx");
});

void test("buildAuditFindingId renders an undefined itemIdentity as an empty segment", () => {
  assert.equal(buildAuditFindingId("check-key", "node-1", undefined, "ctx"), "check-key::node-1::::ctx");
});

void test("buildAuditFindingId renders an undefined context as an empty segment", () => {
  assert.equal(buildAuditFindingId("check-key", "node-1", "item-1", undefined), "check-key::node-1::item-1::");
});

void test("buildAuditFindingId with only checkKey set renders three trailing empty segments", () => {
  assert.equal(buildAuditFindingId("check-key", undefined, undefined, undefined), "check-key::::::");
});

void test("buildAuditFindingId treats an empty string the same as undefined", () => {
  assert.equal(
    buildAuditFindingId("check-key", "", "item-1", "ctx"),
    buildAuditFindingId("check-key", undefined, "item-1", "ctx"),
  );
});

void test("buildAuditFindingId is deterministic for the same inputs", () => {
  const first = buildAuditFindingId("check-key", "node-1", "item-1", "ctx");
  const second = buildAuditFindingId("check-key", "node-1", "item-1", "ctx");
  assert.equal(first, second);
});

void test("buildAuditFindingId changes when checkKey changes", () => {
  assert.notEqual(
    buildAuditFindingId("check-a", "node-1", "item-1", "ctx"),
    buildAuditFindingId("check-b", "node-1", "item-1", "ctx"),
  );
});

void test("buildAuditFindingId changes when only context changes", () => {
  assert.notEqual(
    buildAuditFindingId("check-key", "node-1", "item-1", "ctx-a"),
    buildAuditFindingId("check-key", "node-1", "item-1", "ctx-b"),
  );
});

void test("buildAuditFindingId preserves '::' occurring inside a field verbatim (no escaping)", () => {
  assert.equal(buildAuditFindingId("check::key", "node-1", "item-1", "ctx"), "check::key::node-1::item-1::ctx");
});
