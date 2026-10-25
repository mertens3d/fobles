// @source-path [fobles] tests/unit/auditor/audit-finding-store.test.ts

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createAuditFindingStore,
  filterAuditFindingsByCheck,
  filterAuditFindingsByStatus,
  searchAuditFindings,
  summarizeAuditFindings,
} from "../../../src/content/features/auditor/audit-finding-store.ts";
import type { AuditFinding } from "../../../src/content/features/auditor/audit-finding.types";

function makeFinding(overrides: Partial<AuditFinding> & { id: string }): AuditFinding {
  return {
    status: "passed",
    severity: "info",
    checkKey: "check-a",
    checkLabel: "Check A",
    referenceModelNodeId: undefined,
    itemId: undefined,
    itemName: undefined,
    itemPath: undefined,
    itemIcon: undefined,
    sitecoreUrl: undefined,
    context: undefined,
    summary: "summary",
    details: undefined,
    discoveredAt: 0,
    completedAt: 0,
    ...overrides,
  };
}

void test("upsert adds a new finding, retrievable via getSnapshot", () => {
  const store = createAuditFindingStore();
  store.upsert(makeFinding({ id: "f1" }));
  assert.equal(store.getSnapshot().length, 1);
});

void test("upsert with the same id replaces, not duplicates", () => {
  const store = createAuditFindingStore();
  store.upsert(makeFinding({ id: "f1", summary: "first" }));
  store.upsert(makeFinding({ id: "f1", summary: "second" }));
  const snapshot = store.getSnapshot();
  assert.equal(snapshot.length, 1);
  assert.equal(snapshot[0]?.summary, "second");
});

void test("upsertMany applies a batch and notifies subscribers once", () => {
  const store = createAuditFindingStore();
  let notifyCount = 0;
  store.subscribe(() => {
    notifyCount += 1;
  });

  store.upsertMany([makeFinding({ id: "f1" }), makeFinding({ id: "f2" })]);

  assert.equal(store.getSnapshot().length, 2);
  assert.equal(notifyCount, 1);
});

void test("getSnapshot orders by status (pending, error, warning, passed)", () => {
  const store = createAuditFindingStore();
  store.upsertMany([
    makeFinding({ id: "f-passed", status: "passed", checkLabel: "A" }),
    makeFinding({ id: "f-pending", status: "pending", checkLabel: "A" }),
    makeFinding({ id: "f-warning", status: "warning", checkLabel: "A" }),
    makeFinding({ id: "f-error", status: "error", checkLabel: "A" }),
  ]);

  assert.deepEqual(store.getSnapshot().map((finding) => finding.status), ["pending", "error", "warning", "passed"]);
});

void test("getSnapshot orders by check label, then item path/name, then id within the same status", () => {
  const store = createAuditFindingStore();
  store.upsertMany([
    makeFinding({ id: "f3", status: "passed", checkLabel: "B", itemPath: "/sitecore/content/b" }),
    makeFinding({ id: "f1", status: "passed", checkLabel: "A", itemPath: "/sitecore/content/b" }),
    makeFinding({ id: "f2", status: "passed", checkLabel: "A", itemPath: "/sitecore/content/a" }),
  ]);

  assert.deepEqual(store.getSnapshot().map((finding) => finding.id), ["f2", "f1", "f3"]);
});

void test("subscribe returns an unsubscribe function that stops further notifications", () => {
  const store = createAuditFindingStore();
  let notifyCount = 0;
  const unsubscribe = store.subscribe(() => {
    notifyCount += 1;
  });

  store.upsert(makeFinding({ id: "f1" }));
  unsubscribe();
  store.upsert(makeFinding({ id: "f2" }));

  assert.equal(notifyCount, 1);
});

void test("searchAuditFindings matches across item/check/summary/details fields, case-insensitively", () => {
  const findings = [
    makeFinding({ id: "f1", itemName: "Home Page", summary: "ok" }),
    makeFinding({ id: "f2", itemName: "About", summary: "A reference MISMATCH occurred" }),
  ];

  assert.deepEqual(searchAuditFindings(findings, "mismatch").map((finding) => finding.id), ["f2"]);
  assert.deepEqual(searchAuditFindings(findings, "home").map((finding) => finding.id), ["f1"]);
});

void test("searchAuditFindings with an empty/whitespace query returns everything unfiltered", () => {
  const findings = [makeFinding({ id: "f1" }), makeFinding({ id: "f2" })];
  assert.equal(searchAuditFindings(findings, "   ").length, 2);
});

void test("filterAuditFindingsByStatus narrows to the selected statuses, empty set means no filtering", () => {
  const findings = [
    makeFinding({ id: "f1", status: "passed" }),
    makeFinding({ id: "f2", status: "error" }),
  ];

  assert.deepEqual(filterAuditFindingsByStatus(findings, new Set(["error"])).map((finding) => finding.id), ["f2"]);
  assert.equal(filterAuditFindingsByStatus(findings, new Set()).length, 2);
});

void test("filterAuditFindingsByCheck narrows to the selected check keys, empty set means no filtering", () => {
  const findings = [
    makeFinding({ id: "f1", checkKey: "check-a" }),
    makeFinding({ id: "f2", checkKey: "check-b" }),
  ];

  assert.deepEqual(filterAuditFindingsByCheck(findings, new Set(["check-b"])).map((finding) => finding.id), ["f2"]);
  assert.equal(filterAuditFindingsByCheck(findings, new Set()).length, 2);
});

void test("summarizeAuditFindings/getSummary tally findings per status plus a total", () => {
  const store = createAuditFindingStore();
  store.upsertMany([
    makeFinding({ id: "f1", status: "passed" }),
    makeFinding({ id: "f2", status: "passed" }),
    makeFinding({ id: "f3", status: "error" }),
  ]);

  assert.deepEqual(store.getSummary(), { pending: 0, passed: 2, warning: 0, error: 1, total: 3 });
  assert.deepEqual(summarizeAuditFindings(store.getSnapshot()), store.getSummary());
});

void test("clear empties the store and notifies subscribers", () => {
  const store = createAuditFindingStore();
  store.upsert(makeFinding({ id: "f1" }));

  let lastSnapshotLength = -1;
  store.subscribe((snapshot) => {
    lastSnapshotLength = snapshot.length;
  });

  store.clear();

  assert.equal(store.getSnapshot().length, 0);
  assert.equal(lastSnapshotLength, 0);
});

void test("dispose clears findings/subscriptions and rejects further writes", () => {
  const store = createAuditFindingStore();
  store.upsert(makeFinding({ id: "f1" }));

  let notifyCount = 0;
  store.subscribe(() => {
    notifyCount += 1;
  });

  store.dispose();
  store.upsert(makeFinding({ id: "f2" }));

  assert.equal(store.getSnapshot().length, 0);
  assert.equal(notifyCount, 0);
});
