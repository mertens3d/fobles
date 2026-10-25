// @source-path [fobles] src/content/features/auditor/checks/item-resolved-check.ts

import { buildAuditFinding } from "../audit-finding-factory.ts";
import type { AuditCheck, AuditCheckContext } from "../audit-check.types";
import type { AuditFindingStatus } from "../audit-finding.types";

export const ITEM_RESOLVED_CHECK_KEY = "item-resolved";
export const ITEM_RESOLVED_CHECK_LABEL = "Current item resolved";

// Phase-1 check 1 of 4: the current Sitecore item (the Reference Model root) resolved with
// enough identity/display data for the rest of the audit to be meaningful.
export const itemResolvedCheck: AuditCheck = {
  key: ITEM_RESOLVED_CHECK_KEY,
  label: ITEM_RESOLVED_CHECK_LABEL,
  run(context: AuditCheckContext): Promise<void> {
    const root = context.referenceModelRoot;

    if (root.nodeType !== "item") return Promise.resolve();

    const item = root.scItem;
    const hasRequiredIdentity = Boolean(item.scItemId && item.scItemPath);
    const hasDisplayMetadata = Boolean(item.scItemName && item.scTemplate);

    let status: AuditFindingStatus;
    let summary: string;

    if (!hasRequiredIdentity) {
      status = "error";
      summary = "The current item could not be resolved.";
    } else if (!hasDisplayMetadata) {
      status = "warning";
      summary = "The current item resolved, but some display metadata is missing.";
    } else {
      status = "passed";
      summary = "The current item resolved successfully.";
    }

    context.findingStore.upsert(buildAuditFinding({
      checkKey: ITEM_RESOLVED_CHECK_KEY,
      checkLabel: ITEM_RESOLVED_CHECK_LABEL,
      status,
      referenceModelNodeId: root.treeNodeId,
      item,
      summary,
      buildSitecoreUrl: context.buildSitecoreUrl,
    }));

    return Promise.resolve();
  },
};
