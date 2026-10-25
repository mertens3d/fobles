// @source-path [fobles] src/content/features/auditor/audit-report-tree.ts
import type { ReferenceModelNode } from "../reference-model/reference-model.types";
import type { AuditFinding, AuditFindingStatus } from "./audit-finding.types";

export type AuditReportTreeNode = {
  id: string;
  parentId: string | undefined;
  depth: number;
  kind: "reference-model" | "finding";
  label: string;
  secondary: string | undefined;
  status: AuditFindingStatus;
  hasChildren: boolean;
  referenceModelNodeId: string | undefined;
  icon: string | undefined;
  finding: AuditFinding | undefined;
};

const STATUS_WEIGHT: Readonly<Record<AuditFindingStatus, number>> = {
  passed: 0,
  pending: 1,
  warning: 2,
  error: 3,
};

function highestStatus(statuses: readonly AuditFindingStatus[]): AuditFindingStatus {
  return statuses.reduce<AuditFindingStatus>(
    (highest, status) => STATUS_WEIGHT[status] > STATUS_WEIGHT[highest] ? status : highest,
    "passed",
  );
}

function nodeLabel(node: ReferenceModelNode): string {
  if (node.nodeType === "nonItem") return node.name;
  return node.scItem.scItemName ?? node.scItem.scItemPath ?? node.scItem.scItemId ?? "Unnamed item";
}

function nodeSecondary(node: ReferenceModelNode): string | undefined {
  return node.nodeType === "item" ? node.scItem.scItemPath : undefined;
}

function nodeIcon(node: ReferenceModelNode): string | undefined {
  return node.nodeType === "item" ? node.scItem.scItemIcon : undefined;
}

export function buildAuditReportTree(
  referenceModelRoot: ReferenceModelNode,
  findings: readonly AuditFinding[],
): AuditReportTreeNode[] {
  const findingsByTreeNodeId = new Map<string, AuditFinding[]>();

  findings.forEach((finding) => {
    if (!finding.referenceModelNodeId) return;
    const nodeFindings = findingsByTreeNodeId.get(finding.referenceModelNodeId) ?? [];
    nodeFindings.push(finding);
    findingsByTreeNodeId.set(finding.referenceModelNodeId, nodeFindings);
  });

  function visit(
    node: ReferenceModelNode,
    parentId: string | undefined,
    depth: number,
  ): { rows: AuditReportTreeNode[]; status: AuditFindingStatus; hasVisibleContent: boolean } {
    const childResults = node.children.map((child) => visit(child, node.treeNodeId, depth + 1));
    const nodeFindings = findingsByTreeNodeId.get(node.treeNodeId) ?? [];
    const findingRows: AuditReportTreeNode[] = nodeFindings.map((finding) => ({
      id: `finding:${finding.id}`,
      parentId: node.treeNodeId,
      depth: depth + 1,
      kind: "finding",
      label: finding.checkLabel,
      secondary: finding.summary,
      status: finding.status,
      hasChildren: false,
      referenceModelNodeId: finding.referenceModelNodeId,
      icon: undefined,
      finding,
    }));
    const visibleChildren = childResults.filter((result) => result.hasVisibleContent);
    const descendantStatuses = [
      ...nodeFindings.map((finding) => finding.status),
      ...visibleChildren.map((result) => result.status),
    ];
    const hasVisibleContent = descendantStatuses.length > 0;
    const status = highestStatus(descendantStatuses);
    const row: AuditReportTreeNode = {
      id: node.treeNodeId,
      parentId,
      depth,
      kind: "reference-model",
      label: nodeLabel(node),
      secondary: nodeSecondary(node),
      status,
      hasChildren: visibleChildren.length > 0 || findingRows.length > 0,
      referenceModelNodeId: node.treeNodeId,
      icon: nodeIcon(node),
      finding: nodeFindings[0],
    };

    return {
      rows: [row, ...visibleChildren.flatMap((result) => result.rows), ...findingRows],
      status,
      hasVisibleContent,
    };
  }

  return visit(referenceModelRoot, undefined, 0).rows;
}
