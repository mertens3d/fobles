// @source-path [fobles] tests/unit/auditor/audit-csv-exporter.test.ts

import { test } from "node:test";
import assert from "node:assert/strict";
import { buildAuditFindingsCsv } from "../../../src/content/features/auditor/export/audit-csv-exporter.ts";
import { AUDIT_EXPORT_COLUMNS } from "../../../src/content/features/auditor/export/audit-export-columns.ts";
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

void test("buildAuditFindingsCsv: emits a header row even with zero findings", () => {
  const csv = buildAuditFindingsCsv([]);
  const lines = csv.split("\r\n");
  assert.equal(lines.length, 1);
  assert.equal(lines[0], AUDIT_EXPORT_COLUMNS.map((column) => column.header).join(","));
});

void test("buildAuditFindingsCsv: has exactly 10 columns in the specified order", () => {
  assert.deepEqual(AUDIT_EXPORT_COLUMNS.map((column) => column.header), [
    "Status", "Severity", "Check", "Item Name", "Item Path", "Item Id", "Context", "Summary", "Details", "Sitecore URL",
  ]);
});

void test("buildAuditFindingsCsv: one data row per finding, in the order given", () => {
  const csv = buildAuditFindingsCsv([
    makeFinding({ id: "f1", itemName: "Home" }),
    makeFinding({ id: "f2", itemName: "About" }),
  ]);
  const lines = csv.split("\r\n");
  assert.equal(lines.length, 3);
  assert.ok(lines[1]?.includes("Home"));
  assert.ok(lines[2]?.includes("About"));
});

void test("buildAuditFindingsCsv: quotes a field containing a comma", () => {
  const csv = buildAuditFindingsCsv([makeFinding({ id: "f1", summary: "a, b" })]);
  assert.ok(csv.includes('"a, b"'));
});

void test("buildAuditFindingsCsv: quotes and escapes a field containing a double-quote", () => {
  const csv = buildAuditFindingsCsv([makeFinding({ id: "f1", summary: 'say "hi"' })]);
  assert.ok(csv.includes('"say ""hi"""'));
});

void test("buildAuditFindingsCsv: quotes a field containing a newline", () => {
  const csv = buildAuditFindingsCsv([makeFinding({ id: "f1", summary: "line1\nline2" })]);
  assert.ok(csv.includes('"line1\nline2"'));
});

void test("buildAuditFindingsCsv: leaves plain fields unquoted", () => {
  const csv = buildAuditFindingsCsv([makeFinding({ id: "f1", summary: "plain text" })]);
  assert.ok(!csv.split("\r\n")[1]?.includes('"'));
});

void test("buildAuditFindingsCsv: renders undefined optional fields as empty strings, not 'undefined'", () => {
  const csv = buildAuditFindingsCsv([makeFinding({ id: "f1" })]);
  assert.ok(!csv.includes("undefined"));
});
