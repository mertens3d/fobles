// @source-path [fobles] src/content/features/auditor/components/auditor-status-cell.tsx

import type { ICellRendererParams } from "ag-grid-community";
import type { AuditFinding, AuditFindingStatus } from "../audit-finding.types";

const STATUS_GLYPH: Readonly<Record<AuditFindingStatus, string>> = {
  pending: "\u23F3",
  passed: "\u2705",
  warning: "\u26A0\uFE0F",
  error: "\u274C",
};

const STATUS_LABEL: Readonly<Record<AuditFindingStatus, string>> = {
  pending: "Pending",
  passed: "Passed",
  warning: "Warning",
  error: "Error",
};

export function AuditorStatusCell(props: ICellRendererParams<AuditFinding, AuditFindingStatus>) {
  const status = props.value ?? "pending";

  return (
    <span className={`fobles-auditor-status fobles-auditor-status--${status}`}>
      <span aria-hidden="true">{STATUS_GLYPH[status]}</span>
      <span>{STATUS_LABEL[status]}</span>
    </span>
  );
}
