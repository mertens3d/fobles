// @source-path [fobles] src/content/features/auditor/checks/item-navigation-check.ts

import type { ReferenceModelNode } from "../../../foundation/reference-data/model/reference-model.types";
import { buildAuditFinding } from "../audit-finding-factory.ts";
import type { AuditCheck, AuditCheckContext } from "../audit-check.types";
import type { AuditFinding } from "../audit-finding.types";

export const ITEM_NAVIGATION_CHECK_KEY = "item-navigation";
export const ITEM_NAVIGATION_CHECK_LABEL = "Item navigation readiness";

// Phase-1 check 4 of 4: every item node (resolved or not) carries enough identity to build a
// usable Content Editor link - does not require Resolve to have completed, since a GUID or path
// is already present on an unresolved reference node the moment the Reference Model exists.
export const itemNavigationCheck: AuditCheck = {
  key: ITEM_NAVIGATION_CHECK_KEY,
  label: ITEM_NAVIGATION_CHECK_LABEL,
  run(context: AuditCheckContext): Promise<void> {
    const findings: AuditFinding[] = [];

    function visit(node: ReferenceModelNode): void {
      if (node.nodeType === "item") {
        const identity = node.scItem.scItemId ?? node.scItem.scItemPath;

        findings.push(buildAuditFinding({
          checkKey: ITEM_NAVIGATION_CHECK_KEY,
          checkLabel: ITEM_NAVIGATION_CHECK_LABEL,
          status: identity ? "passed" : "warning",
          referenceModelNodeId: node.treeNodeId,
          item: node.scItem,
          summary: identity
            ? "A valid Content Editor link can be generated."
            : "No identity is available to build a navigation link.",
          buildSitecoreUrl: context.buildSitecoreUrl,
        }));
      }

      node.children.forEach(visit);
    }

    visit(context.referenceModelRoot);

    context.findingStore.upsertMany(findings);

    return Promise.resolve();
  },
};
