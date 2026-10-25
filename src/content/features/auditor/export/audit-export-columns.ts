// @source-path [fobles] src/content/features/auditor/export/audit-export-columns.ts

import type { AuditFinding } from "../audit-finding.types";

export type AuditExportColumn = {
  key: string;
  header: string;
  getValue: (finding: AuditFinding) => string;
};

function orEmpty(value: string | undefined): string {
  return value ?? "";
}

// CSV-only for Phase 1 (XLSX/PDF deferred) - ten columns, deterministic order, operating on
// whatever filtered/searched finding set the caller passes in (never re-sorts/re-filters itself).
export const AUDIT_EXPORT_COLUMNS: readonly AuditExportColumn[] = [
  { key: "status", header: "Status", getValue: (finding) => finding.status },
  { key: "severity", header: "Severity", getValue: (finding) => finding.severity },
  { key: "checkLabel", header: "Check", getValue: (finding) => finding.checkLabel },
  { key: "itemName", header: "Item Name", getValue: (finding) => orEmpty(finding.itemName) },
  { key: "itemPath", header: "Item Path", getValue: (finding) => orEmpty(finding.itemPath) },
  { key: "itemId", header: "Item Id", getValue: (finding) => orEmpty(finding.itemId) },
  { key: "context", header: "Context", getValue: (finding) => orEmpty(finding.context) },
  { key: "summary", header: "Summary", getValue: (finding) => finding.summary },
  { key: "details", header: "Details", getValue: (finding) => orEmpty(finding.details) },
  { key: "sitecoreUrl", header: "Sitecore URL", getValue: (finding) => orEmpty(finding.sitecoreUrl) },
];
