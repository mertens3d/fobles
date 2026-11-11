// @source-path [fobles] src/content/features/auditor/checks/reference-resolved-check.ts
import { AUDIT_CHECK } from "../../../../constants/audit-checks.const.ts";
import { extensionLog } from "../../../logger.ts";
import type { ReferenceModelNode } from "../../../foundation/reference-data/model/reference-model.types";
import type { ProcessingStatus } from "../../../foundation/reference-data/processing/processing.types";
import { buildAuditFinding } from "../audit-finding-factory.ts";
import type { AuditCheck } from "../auditor.types";
import type { AuditCheckContext } from "../auditor.types";
import type { AuditFinding } from "../auditor.types";
import type { ReferenceResolvedDiagnostic, ResolveStateInterpretation } from "./reference-resolved-check.types";
const CHECK = AUDIT_CHECK.REFERENCE_RESOLVED;

export function interpretResolveState(status: ProcessingStatus | undefined): ResolveStateInterpretation {
  switch (status) {
    case "not-found":
      return { status: "error", summary: CHECK.SUMMARY.NOT_FOUND };
    case "failed":
      return { status: "warning", summary: CHECK.SUMMARY.FAILED };
    case "unverified":
      return { status: "warning", summary: CHECK.SUMMARY.UNVERIFIED };
    case "enriched":
    case "verified":
    case "revision-mismatch":
      return { status: "passed", summary: CHECK.SUMMARY.RESOLVED };
    default:
      return { status: "pending", summary: CHECK.SUMMARY.PENDING };
  }
}

export const referenceResolvedCheck: AuditCheck = {
  key: CHECK.KEY,
  label: CHECK.LABEL,
  run(context: AuditCheckContext): Promise<void> {
    const findings: AuditFinding[] = [];
    const diagnostics: ReferenceResolvedDiagnostic[] = [];
    function visit(node: ReferenceModelNode): void {
      if (node.nodeType === "item" && context.resolveCandidateTreeNodeIds.has(node.treeNodeId)) {
        const processingStatus = context.processingStateByTreeNodeId.get(node.treeNodeId);
        const interpreted = interpretResolveState(processingStatus);
        diagnostics.push({
          treeNodeId: node.treeNodeId,
          processingStatus,
          findingStatus: interpreted.status,
          itemId: node.scItem.scItemId,
          itemPath: node.scItem.scItemPath,
        });
        findings.push(
          buildAuditFinding({
            checkKey: CHECK.KEY,
            checkLabel: CHECK.LABEL,
            status: interpreted.status,
            referenceModelNodeId: node.treeNodeId,
            item: node.scItem,
            summary:
              processingStatus === "not-found"
                ? `Referenced item ${node.scItem.scItemId ?? node.scItem.scItemPath ?? "(unknown)"} could not be found.`
                : interpreted.summary,
            context:
              node.provenance.type === "rendering-parameter"
                ? `Rendering parameter ${node.provenance.parameterName} references ${node.provenance.decodedValue || node.provenance.parameterValue}.`
                : undefined,
            buildSitecoreUrl: context.buildSitecoreUrl,
          }),
        );
      }
      node.children.forEach(visit);
    }
    visit(context.referenceModelRoot);
    extensionLog.debug("Auditor reference resolved diagnostic: projection", {
      candidateCount: context.resolveCandidateTreeNodeIds.size,
      findingCount: findings.length,
      pendingCount: diagnostics.filter(({ findingStatus }) => findingStatus === "pending").length,
      pending: diagnostics.filter(({ findingStatus }) => findingStatus === "pending"),
      projection: diagnostics,
    });
    context.findingStore.upsertMany(findings);
    return Promise.resolve();
  },
};
