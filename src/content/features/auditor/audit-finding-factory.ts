import type { BuildAuditFindingOptions } from "./auditor.types.js";
// @source-path [fobles] src/content/features/auditor/audit-finding-factory.ts

import { buildAuditFindingId } from "./audit-finding-id.ts";
import type { AuditFinding, AuditFindingSeverity, AuditFindingStatus } from "./auditor.types";

const SEVERITY_BY_STATUS: Readonly<Record<AuditFindingStatus, AuditFindingSeverity>> = {
  error: "error",
  passed: "info",
  pending: "info",
  warning: "warning",
};

// The single place every check builds an AuditFinding from, so id derivation, Sitecore-URL
// construction, and severity-from-status mapping only exist once.
export function buildAuditFinding(options: BuildAuditFindingOptions): AuditFinding {
  const itemIdentity = options.item?.scItemId ?? options.item?.scItemPath;
  const sitecoreUrl = itemIdentity ? options.buildSitecoreUrl?.(itemIdentity) : undefined;
  const discoveredAt = options.discoveredAt ?? Date.now();

  return {
    id: buildAuditFindingId(options.checkKey, options.referenceModelNodeId, itemIdentity, options.context),
    status: options.status,
    severity: SEVERITY_BY_STATUS[options.status],
    checkKey: options.checkKey,
    checkLabel: options.checkLabel,
    referenceModelNodeId: options.referenceModelNodeId,
    itemId: options.item?.scItemId,
    itemName: options.item?.scItemName,
    itemPath: options.item?.scItemPath,
    itemIcon: options.item?.scItemIcon,
    dataType: options.dataType ?? "Item",
    sitecoreUrl,
    context: options.context,
    summary: options.summary,
    details: options.details,
    discoveredAt,
    completedAt: options.status === "pending" ? undefined : (options.completedAt ?? discoveredAt),
  };
}
