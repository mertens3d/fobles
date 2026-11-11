// @source-path [fobles] src/content/features/auditor/components/auditor-test-details-dialog/auditor-test-details-dialog.tsx
import { DialogIconButton } from "../../../../shared/ui/dialog/dialog-icon-button";
import type { AuditFinding } from "../../auditor.types";
import type { AuditFindingStatus } from "../../auditor.types";
import type { AuditorDescendantFailure, AuditorTestDetailsSelection } from "../../auditor-grid/auditor-grid.types.ts";
import { AuditorStatusIcon } from "../auditor-status-icon/auditor-status-icon";

type AuditorTestDetailsDialogProps = { selection: AuditorTestDetailsSelection | undefined; onClose: () => void };
const STATUS_LABEL: Readonly<Record<AuditFindingStatus, string>> = {
  pending: "Pending",
  passed: "Passed",
  warning: "Warning",
  error: "Error",
};

function FindingDetail({ finding }: { finding: AuditFinding }) {
  return (
    <section className={`fobles-auditor-test-result fobles-auditor-test-result--${finding.status}`}>
      <div className="fobles-auditor-test-result-heading">
        <span className="fobles-auditor-test-result-icon">
          <AuditorStatusIcon status={finding.status} />
        </span>
        <div>
          <h3>{finding.checkLabel}</h3>
          <span className="fobles-auditor-test-result-status">{STATUS_LABEL[finding.status]}</span>
        </div>
      </div>
      <dl>
        <div>
          <dt>Summary</dt>
          <dd>{finding.summary}</dd>
        </div>
        {finding.details ? (
          <div>
            <dt>Details</dt>
            <dd>{finding.details}</dd>
          </div>
        ) : null}
        {finding.context ? (
          <div>
            <dt>Context</dt>
            <dd>{finding.context}</dd>
          </div>
        ) : null}
        {finding.itemId ? (
          <div>
            <dt>Item ID</dt>
            <dd>{finding.itemId}</dd>
          </div>
        ) : null}
        {finding.itemPath ? (
          <div>
            <dt>Path</dt>
            <dd>{finding.itemPath}</dd>
          </div>
        ) : null}
      </dl>
    </section>
  );
}

function DescendantFailure({ failure }: { failure: AuditorDescendantFailure }) {
  return (
    <section className="fobles-auditor-descendant-failure">
      <div className="fobles-auditor-descendant-failure-heading">
        <span>
          <AuditorStatusIcon status="error" />
        </span>
        <div>
          <strong>{failure.label}</strong>
          <div>{failure.hierarchy.join(" › ")}</div>
        </div>
      </div>
      {failure.findings.map((finding) => (
        <FindingDetail key={finding.id} finding={finding} />
      ))}
    </section>
  );
}

export function AuditorTestDetailsDialog({ selection, onClose }: AuditorTestDetailsDialogProps) {
  if (!selection || selection.row.findings.length === 0) {
    return null;
  }
  const { row, ancestors } = selection;
  const ancestry = [...ancestors.map((ancestor) => ancestor.label), row.label].join(" › ");
  const visibleOwnFindings = row.findings.filter(
    (finding) => finding.checkKey !== "cache-validation" && finding.checkKey !== "item-navigation",
  );
  return (
    <div
      className="fobles-auditor-test-details-backdrop"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) {
          onClose();
        }
      }}
    >
      <section
        className="fobles-auditor-test-details"
        role="dialog"
        aria-modal="true"
        aria-label={`Test results for ${row.label}`}
      >
        <DialogIconButton kind="close" label="Close test results" onClick={onClose} />
        <header className="fobles-auditor-test-details-header">
          <h2>Test Results</h2>
          <div className="fobles-auditor-test-details-row-name">{row.label}</div>
          <dl className="fobles-auditor-test-details-row-info">
            <div>
              <dt>Kind</dt>
              <dd>{row.kind}</dd>
            </div>
            <div>
              <dt>Hierarchy</dt>
              <dd>{ancestry}</dd>
            </div>
            {row.details ? (
              <div>
                <dt>Details</dt>
                <dd>{row.details}</dd>
              </div>
            ) : null}
            {row.path ? (
              <div>
                <dt>Path</dt>
                <dd>{row.path}</dd>
              </div>
            ) : null}
          </dl>
        </header>
        {row.descendantFailures.length > 0 ? (
          <section className="fobles-auditor-descendant-failures">
            <h3>
              Descendant Failures <span>{row.descendantFailures.length}</span>
            </h3>
            {row.descendantFailures.map((failure) => (
              <DescendantFailure key={failure.rowId} failure={failure} />
            ))}
          </section>
        ) : null}
        {visibleOwnFindings.length > 0 ? (
          <section className="fobles-auditor-own-tests">
            <h3>Tests for This Row</h3>
            <div className="fobles-auditor-test-results">
              {visibleOwnFindings.map((finding) => (
                <FindingDetail key={finding.id} finding={finding} />
              ))}
            </div>
          </section>
        ) : null}
      </section>
    </div>
  );
}
