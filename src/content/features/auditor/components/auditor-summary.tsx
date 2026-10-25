// @source-path [fobles] src/content/features/auditor/components/auditor-summary.tsx
import type { AuditFindingStatus } from "../audit-finding.types";
import type { AuditSummaryCounts } from "../auditor.types";

export type AuditorSummaryProps = {
  counts: AuditSummaryCounts;
  selectedStatuses: ReadonlySet<AuditFindingStatus>;
  onToggleStatus: (status: AuditFindingStatus) => void;
};

const ITEMS: readonly {
  status: AuditFindingStatus;
  label: string;
  key: keyof AuditSummaryCounts;
}[] = [
  { status: "pending", label: "Pending", key: "pending" },
  { status: "passed", label: "Passed", key: "passed" },
  { status: "warning", label: "Warning", key: "warning" },
  { status: "error", label: "Sitecore Error", key: "error" },
];

export function AuditorSummary({ counts, selectedStatuses, onToggleStatus }: AuditorSummaryProps) {
  return (
    <div className="fobles-auditor-summary">
      <span className="fobles-auditor-summary-item fobles-auditor-summary-item--total">
        Total: {counts.total}
      </span>

      {ITEMS.map(({ status, label, key }) => (
        <label
          key={status}
          className={`fobles-auditor-summary-filter fobles-auditor-summary-item--${status}`}
          title={`Toggle ${label} rows`}
        >
          <input
            type="checkbox"
            checked={selectedStatuses.has(status)}
            onChange={() => onToggleStatus(status)}
          />
          {label}: {counts[key]}
        </label>
      ))}
    </div>
  );
}
