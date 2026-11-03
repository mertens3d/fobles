// @source-path [fobles] tests/unit/auditor/audit-export-columns.test.ts

import { test } from "node:test";
import assert from "node:assert/strict";
import { AUDIT_EXPORT_COLUMNS } from "../../../src/content/features/auditor/export/audit-export-columns.ts";
import type { AuditFinding } from "../../../src/content/features/auditor/audit-finding.types";

function makeFinding(overrides: Partial<AuditFinding> = {}): AuditFinding {
  return {
    id: "finding-1",
    status: "passed",
    severity: "info",
    checkKey: "check-a",
    checkLabel: "Check A",
    referenceModelNodeId: undefined,
    itemId: undefined,
    itemName: undefined,
    itemPath: undefined,
    itemIcon: undefined,
    dataType: "item",
    sitecoreUrl: undefined,
    context: undefined,
    summary: "summary",
    details: undefined,
    discoveredAt: 0,
    completedAt: 0,
    ...overrides,
  };
}

function getColumn(key: string) {
  const column = AUDIT_EXPORT_COLUMNS.find((candidate) => candidate.key === key);
  if (!column) {
    throw new Error(`Expected a column with key "${key}"`);
  }
  return column;
}

void test("AUDIT_EXPORT_COLUMNS contains exactly the ten documented columns", () => {
  assert.equal(AUDIT_EXPORT_COLUMNS.length, 10);
});

void test("AUDIT_EXPORT_COLUMNS has unique column keys", () => {
  const keys = AUDIT_EXPORT_COLUMNS.map((column) => column.key);
  assert.equal(new Set(keys).size, keys.length);
});

void test("AUDIT_EXPORT_COLUMNS has unique column headers", () => {
  const headers = AUDIT_EXPORT_COLUMNS.map((column) => column.header);
  assert.equal(new Set(headers).size, headers.length);
});

void test("status column returns the finding's status directly", () => {
  assert.equal(getColumn("status").getValue(makeFinding({ status: "warning" })), "warning");
});

void test("severity column returns the finding's severity directly", () => {
  assert.equal(getColumn("severity").getValue(makeFinding({ severity: "error" })), "error");
});

void test("checkLabel column returns the finding's checkLabel directly", () => {
  assert.equal(getColumn("checkLabel").getValue(makeFinding({ checkLabel: "Broken Link Check" })), "Broken Link Check");
});

void test("summary column returns the finding's summary directly", () => {
  assert.equal(getColumn("summary").getValue(makeFinding({ summary: "Something is wrong" })), "Something is wrong");
});

void test("itemName column returns the value when present", () => {
  assert.equal(getColumn("itemName").getValue(makeFinding({ itemName: "Home" })), "Home");
});

void test("itemName column falls back to an empty string when undefined", () => {
  assert.equal(getColumn("itemName").getValue(makeFinding({ itemName: undefined })), "");
});

void test("itemPath column returns the value when present", () => {
  assert.equal(
    getColumn("itemPath").getValue(makeFinding({ itemPath: "/sitecore/content/Home" })),
    "/sitecore/content/Home",
  );
});

void test("itemPath column falls back to an empty string when undefined", () => {
  assert.equal(getColumn("itemPath").getValue(makeFinding({ itemPath: undefined })), "");
});

void test("itemId column returns the value when present", () => {
  assert.equal(getColumn("itemId").getValue(makeFinding({ itemId: "{GUID}" })), "{GUID}");
});

void test("itemId column falls back to an empty string when undefined", () => {
  assert.equal(getColumn("itemId").getValue(makeFinding({ itemId: undefined })), "");
});

void test("context column returns the value when present", () => {
  assert.equal(getColumn("context").getValue(makeFinding({ context: "Field: Title" })), "Field: Title");
});

void test("context column falls back to an empty string when undefined", () => {
  assert.equal(getColumn("context").getValue(makeFinding({ context: undefined })), "");
});

void test("details column returns the value when present", () => {
  assert.equal(getColumn("details").getValue(makeFinding({ details: "Extra detail" })), "Extra detail");
});

void test("details column falls back to an empty string when undefined", () => {
  assert.equal(getColumn("details").getValue(makeFinding({ details: undefined })), "");
});

void test("sitecoreUrl column returns the value when present", () => {
  assert.equal(
    getColumn("sitecoreUrl").getValue(makeFinding({ sitecoreUrl: "https://example.com/item" })),
    "https://example.com/item",
  );
});

void test("sitecoreUrl column falls back to an empty string when undefined", () => {
  assert.equal(getColumn("sitecoreUrl").getValue(makeFinding({ sitecoreUrl: undefined })), "");
});

void test("every column returns a non-empty string for a fully populated finding", () => {
  const finding = makeFinding({
    itemName: "Home",
    itemPath: "/sitecore/content/Home",
    itemId: "{GUID}",
    context: "Field: Title",
    details: "Extra detail",
    sitecoreUrl: "https://example.com/item",
  });
  for (const column of AUDIT_EXPORT_COLUMNS) {
    assert.notEqual(column.getValue(finding), "", `Expected column "${column.key}" to be non-empty`);
  }
});
