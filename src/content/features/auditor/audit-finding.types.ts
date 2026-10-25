// @source-path [fobles] src/content/features/auditor/audit-finding.types.ts

export type AuditFindingStatus = "pending" | "passed" | "warning" | "error";
export type AuditFindingSeverity = "info" | "warning" | "error";

// Immutable by convention - every mutation goes through AuditFindingStore.upsert/upsertMany with
// a brand-new object, never a partial in-place edit of a finding already handed to a caller.
export type AuditFinding = {
  readonly id: string;
  readonly status: AuditFindingStatus;
  readonly severity: AuditFindingSeverity;
  readonly checkKey: string;
  readonly checkLabel: string;
  readonly referenceModelNodeId: string | undefined;
  readonly itemId: string | undefined;
  readonly itemName: string | undefined;
  readonly itemPath: string | undefined;
  readonly itemIcon: string | undefined;
  readonly dataType: string;
  readonly sitecoreUrl: string | undefined;
  readonly context: string | undefined;
  readonly summary: string;
  readonly details: string | undefined;
  readonly discoveredAt: number;
  readonly completedAt: number | undefined;
};
