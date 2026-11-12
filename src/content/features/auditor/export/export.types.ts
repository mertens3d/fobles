import type { AuditFinding } from "../auditor.types";

export type AuditExportColumn = { key: string; header: string; getValue: (finding: AuditFinding) => string };
