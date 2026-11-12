import type { AuditorStatusCellContext, StatusRow } from "./auditor-status-cell.types.js";
// @source-path [fobles] src/content/features/auditor/components/auditor-status-cell/auditor-status-cell.tsx

import type { ICellRendererParams } from "ag-grid-community";
import { useEffect, useRef, useState } from "react";
import type { AuditFindingStatus } from "../../auditor.types";
import { AuditorStatusIcon } from "../auditor-status-icon/auditor-status-icon";

const STATUS_LABEL: Readonly<Record<AuditFindingStatus, string>> = {
  pending: "Pending",
  passed: "Passed",
  warning: "Warning",
  error: "Sitecore Error",
};

export function AuditorStatusCell(props: ICellRendererParams<StatusRow>) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [rowHovered, setRowHovered] = useState(false);
  const status: AuditFindingStatus = props.data?.status ?? "pending";
  const findings = props.data?.findings ?? [];
  const onViewTestDetails = (props.context as AuditorStatusCellContext | undefined)?.onViewTestDetails;
  const interactive = props.data?.isSitecoreItem === true && findings.length > 0 && onViewTestDetails !== undefined;

  useEffect(() => {
    const row = buttonRef.current?.closest(".ag-row");
    if (!row || !interactive) {
      return;
    }
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
    return (
      <span
        className="fobles-auditor-status fobles-auditor-status--cascade"
        title={`${STATUS_LABEL[status]} from descendant results`}
      >
        <AuditorStatusIcon status={status} />
      </span>
    );
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
        if (props.data) {
          onViewTestDetails(props.data);
        }
      }}
    >
      <AuditorStatusIcon status={status} />
    </button>
  );
}
