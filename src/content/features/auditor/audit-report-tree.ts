// @source-path [fobles] src/content/features/auditor/audit-report-tree.ts
import type { ProcessingStateByTreeNodeId, ProcessingStatus } from "../../foundation/reference-data/processing/processing-state";
import { getGraphPresentationState } from "../../foundation/reference-data/model/graph-presentation-state";
import { resolveNodeLabel } from "../reference-graph/graph-nodes/node-label-resolver";
import { NODE_PRESENTATION_BY_KIND } from "../reference-graph/graph-nodes/node-presentation";
import type { ReferenceModelNode } from "../../foundation/reference-data/model/reference-model.types";
import type { AuditFinding, AuditFindingStatus } from "./audit-finding.types";

export type AuditDataOrigin = "Referenced" | "Cached" | "Live" | undefined;
export type AuditReportTreeNode = {
  id: string;
  parentId: string | undefined;
  depth: number;
  kind: "reference-model" | "finding";
  label: string;
  details: string | undefined;
  path: string | undefined;
  origin: AuditDataOrigin;
  status: AuditFindingStatus;
  hasChildren: boolean;
  referenceModelNodeId: string | undefined;
  icon: string | undefined;
  finding: AuditFinding | undefined;
};

const STATUS_WEIGHT: Readonly<Record<AuditFindingStatus, number>> = { passed: 0, pending: 1, warning: 2, error: 3 };

function highestStatus(statuses: readonly AuditFindingStatus[]): AuditFindingStatus {
  return statuses.reduce<AuditFindingStatus>((highest, status) => STATUS_WEIGHT[status] > STATUS_WEIGHT[highest] ? status : highest, "passed");
}

function nodeLabel(node: ReferenceModelNode): string {
  const presentationState = getGraphPresentationState(node);
  const presentation = NODE_PRESENTATION_BY_KIND[presentationState.kind];
  return resolveNodeLabel(node, presentation, presentationState.kind).replace(/\s*\n\s*/g, " ").trim();
}

function nodeOrigin(node: ReferenceModelNode, processingStatus: ProcessingStatus | undefined): AuditDataOrigin {
  if (node.provenance.type === "field-reference" || node.provenance.type === "rendering-parameter") return "Referenced";
  if (processingStatus === "cached" || processingStatus === "verified" || processingStatus === "stale" || processingStatus === "unverified") return "Cached";
  if (processingStatus === "enriched" || processingStatus === "not-found" || processingStatus === "failed") return "Live";
  return undefined;
}

export function buildAuditReportTree(
  referenceModelRoot: ReferenceModelNode,
  findings: readonly AuditFinding[],
  processingStateByTreeNodeId: ProcessingStateByTreeNodeId,
): AuditReportTreeNode[] {
  const findingsByTreeNodeId = new Map<string, AuditFinding[]>();
  findings.forEach((finding) => {
    if (!finding.referenceModelNodeId) return;
    const nodeFindings = findingsByTreeNodeId.get(finding.referenceModelNodeId) ?? [];
    nodeFindings.push(finding);
    findingsByTreeNodeId.set(finding.referenceModelNodeId, nodeFindings);
  });

  function visit(node: ReferenceModelNode, parentId: string | undefined, depth: number): { rows: AuditReportTreeNode[]; status: AuditFindingStatus; hasVisibleContent: boolean } {
    const childResults = node.children.map((child) => visit(child, node.treeNodeId, depth + 1));
    const nodeFindings = findingsByTreeNodeId.get(node.treeNodeId) ?? [];
    const findingRows: AuditReportTreeNode[] = nodeFindings.map((finding) => ({
      id: `finding:${finding.id}`,
      parentId: node.treeNodeId,
      depth: depth + 1,
      kind: "finding",
      label: `Test: ${finding.checkLabel}`,
      details: finding.details ?? finding.summary,
      path: finding.itemPath,
      origin: undefined,
      status: finding.status,
      hasChildren: false,
      referenceModelNodeId: finding.referenceModelNodeId,
      icon: undefined,
      finding,
    }));
    const visibleChildren = childResults.filter((result) => result.hasVisibleContent);
    const descendantStatuses = [...nodeFindings.map((finding) => finding.status), ...visibleChildren.map((result) => result.status)];
    const hasVisibleContent = descendantStatuses.length > 0;
    const status = highestStatus(descendantStatuses);
    const processingStatus = processingStateByTreeNodeId.get(node.treeNodeId);
    const row: AuditReportTreeNode = {
      id: node.treeNodeId,
      parentId,
      depth,
      kind: "reference-model",
      label: nodeLabel(node),
      details: undefined,
      path: node.nodeType === "item" ? node.scItem.scItemPath : undefined,
      origin: nodeOrigin(node, processingStatus),
      status,
      hasChildren: visibleChildren.length > 0 || findingRows.length > 0,
      referenceModelNodeId: node.treeNodeId,
      icon: node.nodeType === "item" ? node.scItem.scItemIcon : undefined,
      finding: nodeFindings[0],
    };
    return { rows: [row, ...findingRows, ...visibleChildren.flatMap((result) => result.rows)], status, hasVisibleContent };
  }

  return visit(referenceModelRoot, undefined, 0).rows;
}
