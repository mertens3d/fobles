// @source-path [fobles] src/content/features/auditor/checks/reference-resolved-check.ts
import { extensionLog } from "../../../logger";
import type { ReferenceModelNode } from "../../reference-model/reference-model.types";
import type { ProcessingStatus } from "../../../shared/reference-model-processing/processing-state";
import { buildAuditFinding } from "../audit-finding-factory.ts";
import type { AuditCheck, AuditCheckContext } from "../audit-check.types";
import type { AuditFinding, AuditFindingStatus } from "../audit-finding.types";
export const REFERENCE_RESOLVED_CHECK_KEY = "reference-resolved";
export const REFERENCE_RESOLVED_CHECK_LABEL = "Referenced target resolved";
export function interpretResolveState(status: ProcessingStatus | undefined): { status: AuditFindingStatus; summary: string } {
  switch (status) {
    case "not-found": return { status: "error", summary: "The referenced item could not be found." };
    case "failed": return { status: "warning", summary: "Unable to process this referenced item after worker recovery was exhausted." };
    case "unverified": return { status: "warning", summary: "The referenced item is unverified because its revision could not be read." };
    case "enriched":
    case "verified":
    case "stale": return { status: "passed", summary: "The referenced item resolves successfully." };
    default: return { status: "pending", summary: "Waiting for Resolve to check this reference." };
  }
}
export const referenceResolvedCheck: AuditCheck = {
  key: REFERENCE_RESOLVED_CHECK_KEY,
  label: REFERENCE_RESOLVED_CHECK_LABEL,
  run(context: AuditCheckContext): Promise<void> {
    const findings: AuditFinding[] = [];
    const diagnostics: Array<{ treeNodeId: string; processingStatus: ProcessingStatus | undefined; findingStatus: AuditFindingStatus; itemId: string | undefined; itemPath: string | undefined; }> = [];
    function visit(node: ReferenceModelNode): void {
      if (node.nodeType === "item" && context.resolveCandidateTreeNodeIds.has(node.treeNodeId)) {
        const processingStatus = context.processingStateByTreeNodeId.get(node.treeNodeId);
        const interpreted = interpretResolveState(processingStatus);
        diagnostics.push({ treeNodeId: node.treeNodeId, processingStatus, findingStatus: interpreted.status, itemId: node.scItem.scItemId, itemPath: node.scItem.scItemPath });
        findings.push(buildAuditFinding({ checkKey: REFERENCE_RESOLVED_CHECK_KEY, checkLabel: REFERENCE_RESOLVED_CHECK_LABEL, status: interpreted.status, referenceModelNodeId: node.treeNodeId, item: node.scItem, summary: interpreted.summary, buildSitecoreUrl: context.buildSitecoreUrl }));
      }
      node.children.forEach(visit);
    }
    visit(context.referenceModelRoot);
    extensionLog.debug("Auditor reference resolved diagnostic: projection", { candidateCount: context.resolveCandidateTreeNodeIds.size, findingCount: findings.length, pendingCount: diagnostics.filter(({ findingStatus }) => findingStatus === "pending").length, pending: diagnostics.filter(({ findingStatus }) => findingStatus === "pending"), projection: diagnostics });
    context.findingStore.upsertMany(findings);
    return Promise.resolve();
  },
};
