// @source-path [fobles] src/content/features/auditor/components/auditor-tree-cell/auditor-group-badge.tsx

import { AUDITOR_GROUP_COPY } from "../../auditor-grid/auditor-group-status.const";
import type { AuditorGroupCount, AuditorGroupStatus } from "../../auditor-grid/auditor-grid.types";
import { AuditorAuditingDots } from "./auditor-auditing-dots";
import type { AuditorGroupBadgeProps } from "./auditor-tree-cell.types";

function countText(count: AuditorGroupCount): string {
  return count.available > count.shown ? `${count.shown} of ${count.available}` : String(count.shown);
}

function AuditingBadge() {
  return (
    <>
      <AuditorAuditingDots />
      <span className="fobles-auditor-tree-sr">, {AUDITOR_GROUP_COPY.COUNT_SUFFIX_AUDITING}</span>
    </>
  );
}

function CountBadge({ count, noun }: { count: AuditorGroupCount; noun: string }) {
  const title = `${countText(count)} ${noun} ${AUDITOR_GROUP_COPY.FOUND_SUFFIX}`;
  return (
    <span className="fobles-auditor-tree-count" title={title} aria-label={title}>
      ({countText(count)})
    </span>
  );
}

function FailedBadge({ noun }: { noun: string }) {
  const title = `${AUDITOR_GROUP_COPY.FAILED_PREFIX} ${noun}`;
  return (
    <span className="fobles-auditor-tree-failed" title={title} aria-label={title}>
      ⚠
    </span>
  );
}

function StatusBadge({ status }: { status: AuditorGroupStatus }) {
  return status.state === "auditing" ? (
    <AuditingBadge />
  ) : status.state === "failed" ? (
    <FailedBadge noun={status.noun} />
  ) : status.note ? (
    <span className="fobles-auditor-tree-note">{status.note}</span>
  ) : status.count ? (
    <CountBadge count={status.count} noun={status.noun} />
  ) : null;
}

export function AuditorGroupBadge({ row }: AuditorGroupBadgeProps) {
  return row.placeholder === "auditing" ? (
    <AuditorAuditingDots />
  ) : row.groupStatus ? (
    <StatusBadge status={row.groupStatus} />
  ) : null;
}
