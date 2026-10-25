// @source-path [fobles] src/content/features/auditor/audit-finding-id.ts

// Deterministic, re-derivable identity - re-running a check for the same node/item/context must
// always produce the SAME finding id, so upserts converge onto one row instead of accumulating
// duplicates across audit runs.
export function buildAuditFindingId(
  checkKey: string,
  referenceModelNodeId: string | undefined,
  itemIdentity: string | undefined,
  context: string | undefined,
): string {
  return [checkKey, referenceModelNodeId ?? "", itemIdentity ?? "", context ?? ""].join("::");
}
