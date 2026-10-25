// @source-path [fobles] src/content/features/auditor/components/auditor-status-cell.tsx
import type { ICellRendererParams } from "ag-grid-community";
import type { AuditFindingStatus } from "../audit-finding.types";

const STATUS_GLYPH: Readonly<Record<AuditFindingStatus, string>> = {
  pending: "⏳",
  passed: "✅",
  warning: "⚠️",
  error: "❌",
};

const STATUS_LABEL: Readonly<Record<AuditFindingStatus, string>> = {
  pending: "Pending",
  passed: "Passed",
  warning: "Warning",
  error: "Sitecore Error",
};

type StatusRow = { status: AuditFindingStatus };

export function AuditorStatusCell(props: ICellRendererParams<StatusRow, AuditFindingStatus>) {
  const status = props.value ?? "pending";

  return (
    <span
      className={`fobles-auditor-status fobles-auditor-status--${status}`}
      aria-label={STATUS_LABEL[status]}
      title={STATUS_LABEL[status]}
    >
      <span aria-hidden="true">{STATUS_GLYPH[status]}</span>
    </span>
  );
}
