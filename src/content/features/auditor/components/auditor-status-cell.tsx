// @source-path [fobles] src/content/features/auditor/components/auditor-status-cell.tsx

import { useEffect, useRef, useState, type CSSProperties, type SyntheticEvent } from "react";
import type { ICellRendererParams } from "ag-grid-community";
import type { AuditFinding, AuditFindingStatus } from "../audit-finding.types";

const STATUS_GLYPH: Readonly<Record<AuditFindingStatus, string>> = { pending: "⏳", passed: "✅", warning: "⚠️", error: "❌" };
const STATUS_LABEL: Readonly<Record<AuditFindingStatus, string>> = { pending: "Pending", passed: "Passed", warning: "Warning", error: "Sitecore Error" };
const STATUS_BASE_STYLE: CSSProperties = { alignItems: "center", background: "transparent", border: "1px solid transparent", borderRadius: 5, boxSizing: "border-box", display: "inline-flex", height: 26, justifyContent: "center", lineHeight: 1, padding: 0, width: 26 };
const STATUS_ACTION_STYLE: CSSProperties = { ...STATUS_BASE_STYLE, cursor: "pointer", transition: "background-color 120ms ease, border-color 120ms ease, box-shadow 120ms ease, opacity 120ms ease, transform 120ms ease" };
const STATUS_CASCADE_STYLE: CSSProperties = { ...STATUS_BASE_STYLE, cursor: "default", opacity: 0.48 };

type StatusRow = { status: AuditFindingStatus; findings: readonly AuditFinding[]; isSitecoreItem: boolean };
type AuditorStatusCellContext = { onViewTestDetails?: (findings: readonly AuditFinding[]) => void };

function applyHover(event: SyntheticEvent<HTMLButtonElement>, active: boolean): void {
  event.currentTarget.style.backgroundColor = active ? "#e7f3ff" : "transparent";
  event.currentTarget.style.borderColor = active ? "#76b9ed" : "transparent";
  event.currentTarget.style.boxShadow = active ? "inset 0 1px 0 rgba(255,255,255,.9), 0 1px 3px rgba(0,90,158,.35)" : "none";
  event.currentTarget.style.transform = active ? "translateY(-1px)" : "none";
}

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

  if (!interactive) return <span style={STATUS_CASCADE_STYLE} title={`${STATUS_LABEL[status]} from descendant results`}>{STATUS_GLYPH[status]}</span>;

  return (
    <button
      ref={buttonRef}
      type="button"
      className="fobles-auditor-status-action"
      style={{ ...STATUS_ACTION_STYLE, backgroundColor: rowHovered ? "#e7f3ff" : "transparent", borderColor: rowHovered ? "#76b9ed" : "transparent", boxShadow: rowHovered ? "inset 0 1px 0 rgba(255,255,255,.9), 0 1px 3px rgba(0,90,158,.35)" : "none", opacity: rowHovered ? 1 : 0.72, transform: rowHovered ? "translateY(-1px)" : "none" }}
      title={`View test details (${findings.length})`}
      aria-label={`View test details: ${STATUS_LABEL[status]}, ${findings.length} result${findings.length === 1 ? "" : "s"}`}
      onMouseEnter={(event) => applyHover(event, true)}
      onMouseLeave={(event) => applyHover(event, false)}
      onFocus={(event) => applyHover(event, true)}
      onBlur={(event) => applyHover(event, false)}
      onClick={(event) => {
        event.stopPropagation();
        onViewTestDetails(findings);
      }}
    >
      {STATUS_GLYPH[status]}
    </button>
  );
}
