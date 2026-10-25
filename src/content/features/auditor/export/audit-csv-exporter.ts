import { downloadSanitizedText } from "../../../../shared/export/text-export";
import type { AuditFinding } from "../audit-finding.types";
import { AUDIT_EXPORT_COLUMNS, type AuditExportColumn } from "./audit-export-columns.ts";

function escapeCsvField(value: string): string {
  const needsQuoting = /[",\r\n]/.test(value);
  const escaped = value.replace(/"/g, '""');
  return needsQuoting ? `"${escaped}"` : escaped;
}

function buildRow(values: readonly string[]): string {
  return values.map(escapeCsvField).join(",");
}

export function buildAuditFindingsCsv(findings: readonly AuditFinding[], columns: readonly AuditExportColumn[] = AUDIT_EXPORT_COLUMNS): string {
  const headerRow = buildRow(columns.map((column) => column.header));
  const dataRows = findings.map((finding) => buildRow(columns.map((column) => column.getValue(finding))));
  return [headerRow, ...dataRows].join("\r\n");
}

export function downloadAuditFindingsCsv(doc: Document, findings: readonly AuditFinding[], fileName: string): void {
  downloadSanitizedText(doc, buildAuditFindingsCsv(findings), fileName, "text/csv;charset=utf-8", true);
}
