// @source-path [fobles] src/content/features/auditor/components/auditor-item-cell.tsx

import type { ICellRendererParams } from "ag-grid-community";
import type { AuditFinding } from "../audit-finding.types";

export function AuditorItemCell(props: ICellRendererParams<AuditFinding>) {
  const finding = props.data;
  const label = finding?.itemName ?? finding?.itemPath ?? finding?.itemId ?? "(unresolved)";

  return (
    <span className="fobles-auditor-item-cell">
      {finding?.itemIcon ? <img className="fobles-auditor-item-cell-icon" src={finding.itemIcon} alt="" /> : undefined}
      {finding?.sitecoreUrl ? (
        <a href={finding.sitecoreUrl} target="_blank" rel="noopener noreferrer">{label}</a>
      ) : (
        <span>{label}</span>
      )}
    </span>
  );
}
