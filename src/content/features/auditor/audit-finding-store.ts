// @source-path [fobles] src/content/features/auditor/audit-finding-store.ts

import type { AuditSummaryCounts } from "./auditor.types";
import type { AuditFinding, AuditFindingStatus } from "./audit-finding.types";

const STATUS_ORDER: Readonly<Record<AuditFindingStatus, number>> = {
  pending: 0,
  error: 1,
  warning: 2,
  passed: 3,
};

function compareFindings(left: AuditFinding, right: AuditFinding): number {
  const statusDelta = STATUS_ORDER[left.status] - STATUS_ORDER[right.status];
  if (statusDelta !== 0) return statusDelta;

  const checkLabelDelta = left.checkLabel.localeCompare(right.checkLabel);
  if (checkLabelDelta !== 0) return checkLabelDelta;

  const leftPathOrName = left.itemPath ?? left.itemName ?? "";
  const rightPathOrName = right.itemPath ?? right.itemName ?? "";
  const pathDelta = leftPathOrName.localeCompare(rightPathOrName);

  return pathDelta !== 0 ? pathDelta : left.id.localeCompare(right.id);
}

function matchesQuery(finding: AuditFinding, normalizedQuery: string): boolean {
  const haystack = [
    finding.itemId,
    finding.itemName,
    finding.itemPath,
    finding.checkLabel,
    finding.context,
    finding.summary,
    finding.details,
    finding.status,
    finding.severity,
  ]
    .filter((value): value is string => Boolean(value))
    .join("\n")
    .toLowerCase();

  return haystack.includes(normalizedQuery);
}

// Pure query functions - usable directly against any findings array (e.g. in tests), and reused
// as the store's own search/filterByStatus/filterByCheck methods below.
export function searchAuditFindings(findings: readonly AuditFinding[], query: string): readonly AuditFinding[] {
  const normalizedQuery = query.trim().toLowerCase();
  return normalizedQuery ? findings.filter((finding) => matchesQuery(finding, normalizedQuery)) : findings;
}

export function filterAuditFindingsByStatus(
  findings: readonly AuditFinding[],
  statuses: ReadonlySet<AuditFindingStatus>,
): readonly AuditFinding[] {
  return statuses.size === 0 ? findings : findings.filter((finding) => statuses.has(finding.status));
}

export function filterAuditFindingsByCheck(
  findings: readonly AuditFinding[],
  checkKeys: ReadonlySet<string>,
): readonly AuditFinding[] {
  return checkKeys.size === 0 ? findings : findings.filter((finding) => checkKeys.has(finding.checkKey));
}

export function summarizeAuditFindings(findings: readonly AuditFinding[]): AuditSummaryCounts {
  const counts: AuditSummaryCounts = { pending: 0, passed: 0, warning: 0, error: 0, total: findings.length };
  findings.forEach((finding) => {
    counts[finding.status] += 1;
  });

  return counts;
}

export type AuditFindingStoreListener = (snapshot: readonly AuditFinding[]) => void;

export type AuditFindingStore = {
  upsert: (finding: AuditFinding) => void;
  upsertMany: (findings: readonly AuditFinding[]) => void;
  getSnapshot: () => readonly AuditFinding[];
  subscribe: (listener: AuditFindingStoreListener) => () => void;
  search: (query: string) => readonly AuditFinding[];
  filterByStatus: (statuses: ReadonlySet<AuditFindingStatus>) => readonly AuditFinding[];
  filterByCheck: (checkKeys: ReadonlySet<string>) => readonly AuditFinding[];
  getSummary: () => AuditSummaryCounts;
  clear: () => void;
  dispose: () => void;
};

// Framework-independent by design - no React/AG Grid import may ever land in this file. UI layers
// subscribe and re-render themselves; this module only owns identity-keyed storage + ordering.
export function createAuditFindingStore(): AuditFindingStore {
  const findingsById = new Map<string, AuditFinding>();
  const listeners = new Set<AuditFindingStoreListener>();
  let sortedSnapshot: readonly AuditFinding[] | undefined;
  let disposed = false;

  function getSnapshot(): readonly AuditFinding[] {
    sortedSnapshot ??= Array.from(findingsById.values()).sort(compareFindings);
    return sortedSnapshot;
  }

  function notify(): void {
    const snapshot = getSnapshot();
    listeners.forEach((listener) => listener(snapshot));
  }

  function upsertMany(findings: readonly AuditFinding[]): void {
    if (disposed || findings.length === 0) return;

    findings.forEach((finding) => findingsById.set(finding.id, finding));
    sortedSnapshot = undefined;
    notify();
  }

  function upsert(finding: AuditFinding): void {
    upsertMany([finding]);
  }

  function subscribe(listener: AuditFindingStoreListener): () => void {
    if (disposed) return () => undefined;

    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  function clear(): void {
    if (disposed) return;

    findingsById.clear();
    sortedSnapshot = undefined;
    notify();
  }

  function dispose(): void {
    if (disposed) return;

    disposed = true;
    findingsById.clear();
    sortedSnapshot = undefined;
    listeners.clear();
  }

  return {
    upsert,
    upsertMany,
    getSnapshot,
    subscribe,
    search: (query) => searchAuditFindings(getSnapshot(), query),
    filterByStatus: (statuses) => filterAuditFindingsByStatus(getSnapshot(), statuses),
    filterByCheck: (checkKeys) => filterAuditFindingsByCheck(getSnapshot(), checkKeys),
    getSummary: () => summarizeAuditFindings(getSnapshot()),
    clear,
    dispose,
  };
}
