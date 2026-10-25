// @source-path [fobles] tests/unit/auditor/audit-lifecycle.test.ts

import { test } from "node:test";
import assert from "node:assert/strict";
import { buildAuditFindingId } from "../../../src/content/features/auditor/audit-finding-id.ts";
import { buildAuditFinding } from "../../../src/content/features/auditor/audit-finding-factory.ts";
import { createAuditFindingStore } from "../../../src/content/features/auditor/audit-finding-store.ts";

void test("buildAuditFindingId: identical inputs produce the identical id (re-run convergence)", () => {
  const first = buildAuditFindingId("check-a", "node-1", "id-1", "ctx");
  const second = buildAuditFindingId("check-a", "node-1", "id-1", "ctx");
  assert.equal(first, second);
});

void test("buildAuditFindingId: differing in any single component changes the id", () => {
  const base = buildAuditFindingId("check-a", "node-1", "id-1", "ctx");
  assert.notEqual(buildAuditFindingId("check-b", "node-1", "id-1", "ctx"), base);
  assert.notEqual(buildAuditFindingId("check-a", "node-2", "id-1", "ctx"), base);
  assert.notEqual(buildAuditFindingId("check-a", "node-1", "id-2", "ctx"), base);
  assert.notEqual(buildAuditFindingId("check-a", "node-1", "id-1", "other"), base);
});

void test("buildAuditFinding: pending findings have no completedAt; settled findings do", () => {
  const pending = buildAuditFinding({
    checkKey: "check-a",
    checkLabel: "Check A",
    status: "pending",
    referenceModelNodeId: "node-1",
    item: undefined,
    summary: "waiting",
  });
  const passed = buildAuditFinding({
    checkKey: "check-a",
    checkLabel: "Check A",
    status: "passed",
    referenceModelNodeId: "node-1",
    item: undefined,
    summary: "done",
  });

  assert.equal(pending.completedAt, undefined);
  assert.ok(typeof passed.completedAt === "number");
});

void test("buildAuditFinding: derives severity from status (warning->warning, error->error, else info)", () => {
  const options = { checkKey: "check-a", checkLabel: "Check A", referenceModelNodeId: "node-1", item: undefined, summary: "s" };
  assert.equal(buildAuditFinding({ ...options, status: "warning" }).severity, "warning");
  assert.equal(buildAuditFinding({ ...options, status: "error" }).severity, "error");
  assert.equal(buildAuditFinding({ ...options, status: "passed" }).severity, "info");
  assert.equal(buildAuditFinding({ ...options, status: "pending" }).severity, "info");
});

void test("a disposed AuditFindingStore used by the Auditor session rejects further writes idempotently", () => {
  const store = createAuditFindingStore();
  store.dispose();

  // dispose + continued writes afterward must never throw, mirroring how AuditSession.close()
  // tears down the store unconditionally even if a resolve callback fires late.
  assert.doesNotThrow(() => {
    store.dispose();
    store.upsert(buildAuditFinding({
      checkKey: "check-a",
      checkLabel: "Check A",
      status: "passed",
      referenceModelNodeId: "node-1",
      item: undefined,
      summary: "late write",
    }));
  });
  assert.equal(store.getSnapshot().length, 0);
});
