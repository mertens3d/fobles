// @source-path [fobles] src/content/features/auditor/checks/cache-validation-check.ts

import type { ReferenceModelNode } from "../../reference-model/reference-model.types";
import type { ProcessingStatus } from "../../../shared/reference-model-processing/processing-state";
import { buildAuditFinding } from "../audit-finding-factory.ts";
import type { AuditCheck, AuditCheckContext } from "../audit-check.types";
import type { AuditFinding, AuditFindingStatus } from "../audit-finding.types";

export const CACHE_VALIDATION_CHECK_KEY = "cache-validation";
export const CACHE_VALIDATION_CHECK_LABEL = "Cached revision state";

function interpretCacheValidationState(
  processingState: ProcessingStatus | undefined,
  revalidationResult: "passed" | "error" | undefined,
): { status: AuditFindingStatus; summary: string } | undefined {
  if (revalidationResult === "passed") return { status: "passed", summary: "Revision mismatch resolved after re-harvest." };
  if (revalidationResult === "error") return { status: "error", summary: "Revision mismatch remains unresolved; re-harvest failed." };

  if (processingState === "stale") return { status: "pending", summary: "Revision mismatch detected; re-harvest in progress." };
  if (processingState === "verified") return { status: "passed", summary: "Cached revision matches the live revision." };
  if (processingState === "unverified") return { status: "warning", summary: "Revision could not be verified." };

  // Nodes that are brand-new ("enriched"/"pending"/"enriching") or failed/not-found never had a
  // cache record to compare against - this check only ever applies once a comparison happened.
  return undefined;
}

// Phase-1 check 3 of 4: for item nodes where a cached revision was actually compared against a
// live revision, report whether that comparison held - distinct from check 2 (existence).
export const cacheValidationCheck: AuditCheck = {
  key: CACHE_VALIDATION_CHECK_KEY,
  label: CACHE_VALIDATION_CHECK_LABEL,
  run(context: AuditCheckContext): Promise<void> {
    const findings: AuditFinding[] = [];

    function visit(node: ReferenceModelNode): void {
      if (node.nodeType === "item") {
        const interpreted = interpretCacheValidationState(
          context.processingStateByTreeNodeId.get(node.treeNodeId),
          context.cacheRevalidationResultByTreeNodeId.get(node.treeNodeId),
        );

        if (interpreted) {
          findings.push(buildAuditFinding({
            checkKey: CACHE_VALIDATION_CHECK_KEY,
            checkLabel: CACHE_VALIDATION_CHECK_LABEL,
            status: interpreted.status,
            referenceModelNodeId: node.treeNodeId,
            item: node.scItem,
            summary: interpreted.summary,
            buildSitecoreUrl: context.buildSitecoreUrl,
          }));
        }
      }

      node.children.forEach(visit);
    }

    visit(context.referenceModelRoot);

    context.findingStore.upsertMany(findings);

    return Promise.resolve();
  },
};
