// @source-path [fobles] src/content/features/auditor/components/auditor-test-details-dialog/auditor-test-details-dialog.tsx

import type { RefObject } from "react";
import { AUDIT_CHECK } from "../../../../../constants/audit-checks.const";
import { FoblesDetailsWindow } from "../../../../shared/dialog/fobles-details-window";
import type { AuditFinding } from "../../auditor.types";
import type { AuditFindingStatus } from "../../auditor.types";
import type { AuditorDescendantFailure, AuditorTestDetailsSelection } from "../../auditor-grid/auditor-grid.types.ts";
import { AuditorStatusIcon } from "../auditor-status-icon/auditor-status-icon";
import { AUDITOR_TEST_DETAILS } from "./auditor-test-details-dialog.const";

type AuditorTestDetailsDialogProps = {
  selection: AuditorTestDetailsSelection | undefined;
  ownerRef: RefObject<HTMLElement | null>;
  onClose: () => void;
};
type FindingDetailProps = { finding: AuditFinding; showOccurrenceDetails?: boolean };

const STATUS_LABEL: Readonly<Record<AuditFindingStatus, string>> = {
  pending: "Pending",
  passed: "Passed",
  warning: "Warning",
  error: "Error",
};
const HIDDEN_CHECK_KEYS: ReadonlySet<string> = new Set(AUDITOR_TEST_DETAILS.HIDDEN_CHECK_KEYS);

// Agent: Details may hold several facts, one per line (e.g. Referenced target resolved: referrer, reference, path).
function DetailLines({ text }: { text: string }) {
  return (
    <>
      {text.split(AUDIT_CHECK.REFERENCE_RESOLVED.DETAILS.LINE_SEPARATOR).map((line, index) => (
        <div key={`${index}:${line}`}>{line}</div>
      ))}
    </>
  );
}

function FindingFacts({ finding, showOccurrenceDetails = true }: FindingDetailProps) {
  return (
    <dl>
      <div>
        <dt>Summary</dt>
        <dd>{finding.summary}</dd>
      </div>
      {showOccurrenceDetails && finding.details ? (
        <div>
          <dt>Details</dt>
          <dd>
            <DetailLines text={finding.details} />
          </dd>
        </div>
      ) : null}
      {showOccurrenceDetails && finding.context ? (
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
  );
}

// Agent: Details and Context describe one occurrence; a failure found in several places lists every place instead.
function FindingDetail({ finding, showOccurrenceDetails = true }: FindingDetailProps) {
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
      <FindingFacts finding={finding} showOccurrenceDetails={showOccurrenceDetails} />
    </section>
  );
}

function hierarchyText(hierarchy: readonly string[]): string {
  return hierarchy.join(AUDITOR_TEST_DETAILS.HIERARCHY_SEPARATOR);
}

// Agent: One entry per unique failure (same check, status, item and summary). Where it was found more than once,
// Agent: every place is listed under it rather than repeating the whole failure.
function DescendantFailure({ failure }: { failure: AuditorDescendantFailure }) {
  const repeated = failure.occurrences.length > 1;
  const where = repeated
    ? `${AUDITOR_TEST_DETAILS.FOUND_IN_PREFIX} ${failure.occurrences.length} ${AUDITOR_TEST_DETAILS.FOUND_IN_SUFFIX}`
    : hierarchyText(failure.occurrences[0]?.hierarchy ?? []);
  return (
    <section className="fobles-auditor-descendant-failure">
      <div className="fobles-auditor-descendant-failure-heading">
        <span>
          <AuditorStatusIcon status={failure.finding.status} />
        </span>
        <div>
          <strong>{failure.label}</strong>
          <div>{where}</div>
        </div>
      </div>
      {repeated ? (
        <ul className="fobles-auditor-descendant-failure-occurrences">
          {failure.occurrences.map((occurrence) => (
            <li key={occurrence.rowId}>{hierarchyText(occurrence.hierarchy)}</li>
          ))}
        </ul>
      ) : null}
      <FindingDetail finding={failure.finding} showOccurrenceDetails={!repeated} />
    </section>
  );
}

function TestDetailsHeader({ selection }: { selection: AuditorTestDetailsSelection }) {
  const { row, ancestors } = selection;
  return (
    <header className="fobles-auditor-test-details-header">
      <div className="fobles-auditor-test-details-row-name">{row.label}</div>
      <dl className="fobles-auditor-test-details-row-info">
        <div>
          <dt>Kind</dt>
          <dd>{row.kind}</dd>
        </div>
        <div>
          <dt>Hierarchy</dt>
          <dd>{hierarchyText([...ancestors.map((ancestor) => ancestor.label), row.label])}</dd>
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
  );
}

// Agent: Test Results opens in the shared Fobles details window (title bar, close, stacking) like Node Details and
// Agent: the Reference Model, instead of its own modal backdrop.
export function AuditorTestDetailsDialog({ selection, ownerRef, onClose }: AuditorTestDetailsDialogProps) {
  const row = selection?.row;
  const failures = row?.descendantFailures ?? [];
  const ownFindings = row?.findings.filter((finding) => !HIDDEN_CHECK_KEYS.has(finding.checkKey)) ?? [];
  return selection && row && row.findings.length + failures.length > 0 ? (
    <FoblesDetailsWindow id={AUDITOR_TEST_DETAILS.WINDOW_ID} title={AUDITOR_TEST_DETAILS.TITLE} ownerRef={ownerRef}
      className={AUDITOR_TEST_DETAILS.WINDOW_CLASS} onClose={onClose}>
      <section className="fobles-auditor-test-details" aria-label={`${AUDITOR_TEST_DETAILS.TITLE} for ${row.label}`}>
        <TestDetailsHeader selection={selection} />
        {failures.length > 0 ? (
          <section className="fobles-auditor-descendant-failures">
            <h3>
              Descendant Failures <span>{failures.length}</span>
            </h3>
            {failures.map((failure) => (
              <DescendantFailure key={failure.key} failure={failure} />
            ))}
          </section>
        ) : null}
        {ownFindings.length > 0 ? (
          <section className="fobles-auditor-own-tests">
            <h3>Tests for This Row</h3>
            <div className="fobles-auditor-test-results">
              {ownFindings.map((finding) => (
                <FindingDetail key={finding.id} finding={finding} />
              ))}
            </div>
          </section>
        ) : null}
      </section>
    </FoblesDetailsWindow>
  ) : null;
}
