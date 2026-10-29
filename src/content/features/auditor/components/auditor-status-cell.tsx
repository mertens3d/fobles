// @source-path [fobles] src/content/features/auditor/components/auditor-status-cell.tsx

import { useEffect, useRef, useState } from "react";
import type { ICellRendererParams } from "ag-grid-community";
import type { AuditFinding, AuditFindingStatus } from "../audit-finding.types";

const STATUS_GLYPH: Readonly<Record<AuditFindingStatus, string>> = { pending: "⏳", passed: "✅", warning: "⚠️", error: "❌" };
const STATUS_LABEL: Readonly<Record<AuditFindingStatus, string>> = { pending: "Pending", passed: "Passed", warning: "Warning", error: "Sitecore Error" };

type StatusRow = { status: AuditFindingStatus; findings: readonly AuditFinding[]; isSitecoreItem: boolean };
type AuditorStatusCellContext = { onViewTestDetails?: (findings: readonly AuditFinding[]) => void };

export function AuditorStatusCell(props: ICellRendererParams<StatusRow>) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [rowHovered, setRowHovered] = useState(false);
  const status: AuditFindingStatus = props.data?.status ?? "pending";
  const findings = props.data?.findings ?? [];
  const onViewTestDetails = (props.context as AuditorStatusCellContext | undefined)?.onViewTestDetails;
  const interactive = props.data?.isSitecoreItem === true && findings.length > 0 && onViewTestDetails !== undefined;

  useEffect(() => {
    const row = buttonRef.current?.closest(".ag-row");
    if (!row || !interactive) return;

    const activate = (): void => setRowHovered(true);
    const deactivate = (): void => setRowHovered(false);

    row.addEventListener("mouseenter", activate);
    row.addEventListener("mouseleave", deactivate);

    return (): void => {
      row.removeEventListener("mouseenter", activate);
      row.removeEventListener("mouseleave", deactivate);
    };
  }, [interactive]);

  if (!interactive) {
    return <span className="fobles-auditor-status fobles-auditor-status--cascade" title={`${STATUS_LABEL[status]} from descendant results`}>{STATUS_GLYPH[status]}</span>;
  }

  return (
    <button
      ref={buttonRef}
      type="button"
      className={`fobles-auditor-status fobles-auditor-status--action${rowHovered ? " is-row-hovered" : ""}`}
      title={`View test details (${findings.length})`}
      aria-label={`View test details: ${STATUS_LABEL[status]}, ${findings.length} result${findings.length === 1 ? "" : "s"}`}
      onClick={(event) => {
        event.stopPropagation();
        onViewTestDetails(findings);
      }}
    >
      {STATUS_GLYPH[status]}
    </button>
  );
}
