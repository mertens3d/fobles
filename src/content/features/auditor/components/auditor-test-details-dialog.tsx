// @source-path [fobles] src/content/features/auditor/components/auditor-test-details-dialog.tsx
import { DialogIconButton } from "../../../shared/ui/dialog/dialog-icon-button";
import type { AuditFinding } from "../audit-finding.types";

export type AuditorTestDetailsDialogProps = { findings: readonly AuditFinding[]; onClose: () => void };

export function AuditorTestDetailsDialog({ findings, onClose }: AuditorTestDetailsDialogProps) {
  if (findings.length === 0) return null;
  return (
    <div className="fobles-auditor-test-details-backdrop" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}>
      <section className="fobles-auditor-test-details" role="dialog" aria-modal="true" aria-label="Audit test details">
        <DialogIconButton kind="close" label="Close test details" onClick={onClose} />
        <h2>Test Details</h2>
        {findings.map((finding) => (
          <section key={finding.id} className="fobles-auditor-test-result">
            <h3>{finding.checkLabel}</h3>
            <dl>
              <div><dt>Status</dt><dd>{finding.status}</dd></div>
              <div><dt>Summary</dt><dd>{finding.summary}</dd></div>
              {finding.details ? <div><dt>Details</dt><dd>{finding.details}</dd></div> : null}
              {finding.context ? <div><dt>Context</dt><dd>{finding.context}</dd></div> : null}
              {finding.itemPath ? <div><dt>Path</dt><dd>{finding.itemPath}</dd></div> : null}
            </dl>
          </section>
        ))}
      </section>
    </div>
  );
}
