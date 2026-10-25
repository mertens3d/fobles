// @source-path [fobles] src/content/features/auditor/components/auditor-summary.tsx

import type { AuditSummaryCounts } from "../auditor.types";

export type AuditorSummaryProps = {
  counts: AuditSummaryCounts;
};

export function AuditorSummary({ counts }: AuditorSummaryProps) {
  return (
    <div className="fobles-auditor-summary">
      <span className="fobles-auditor-summary-item fobles-auditor-summary-item--total">Total: {counts.total}</span>
      <span className="fobles-auditor-summary-item fobles-auditor-summary-item--pending">Pending: {counts.pending}</span>
      <span className="fobles-auditor-summary-item fobles-auditor-summary-item--passed">Passed: {counts.passed}</span>
      <span className="fobles-auditor-summary-item fobles-auditor-summary-item--warning">Warning: {counts.warning}</span>
      <span className="fobles-auditor-summary-item fobles-auditor-summary-item--error">Error: {counts.error}</span>
    </div>
  );
}
