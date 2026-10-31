// @source-path [fobles] src/content/features/auditor/auditor-grid/auditor-row-projector.ts

import type { ReferenceModelNode } from "../../../foundation/reference-data/model/reference-model.types";
import { buildFoblesUrl } from "../../../foundation/sitecore/fobles-url";
import { getGraphPresentationState } from "../../../foundation/reference-data/model/graph-presentation-state";
import type { ProcessingStateByTreeNodeId } from "../../../foundation/reference-data/processing/processing-state";
import type { SitecoreHarvestFiltersState } from "../../../foundation/harvesting/sitecore-harvester.types";
import type { AuditFinding } from "../audit-finding.types";
import { buildAuditReportTree } from "../audit-report-tree";
import type { AuditorTreeRow, JourneyStage } from "./auditor-grid.types";

const JOURNEY_RANK: Record<JourneyStage, number> = { referenced: 1, cached: 2, live: 3, tested: 4 };
const JOURNEY_BY_RANK: Record<number, JourneyStage> = { 1: "referenced", 2: "cached", 3: "live", 4: "tested" };

export function indexReferenceModelNodes(referenceModelRoot: ReferenceModelNode): Map<string, ReferenceModelNode> {
  const nodesById = new Map<string, ReferenceModelNode>();

  function visit(node: ReferenceModelNode): void {
    nodesById.set(node.treeNodeId, node);
    node.children.forEach(visit);
  }

  visit(referenceModelRoot);
  return nodesById;
}

export function indexFindingsByNode(findings: readonly AuditFinding[]): Map<string, AuditFinding[]> {
  const findingsByNode = new Map<string, AuditFinding[]>();

  findings.forEach((finding) => {
    if (!finding.referenceModelNodeId) return;

    const nodeFindings = findingsByNode.get(finding.referenceModelNodeId) ?? [];
    nodeFindings.push(finding);
    findingsByNode.set(finding.referenceModelNodeId, nodeFindings);
  });

  return findingsByNode;
}

export function projectAuditorRows(
  referenceModelRoot: ReferenceModelNode,
  findings: readonly AuditFinding[],
  processingStateByTreeNodeId: ProcessingStateByTreeNodeId,
  liveSeen: ReadonlySet<string>,
  graphFilters: SitecoreHarvestFiltersState,
): AuditorTreeRow[] {
  const nodesById = indexReferenceModelNodes(referenceModelRoot);
  const findingsByNode = indexFindingsByNode(findings);
  const results: AuditorTreeRow[] = [];

  buildAuditReportTree(referenceModelRoot, findings, processingStateByTreeNodeId)
    .filter((row) => {
      if (row.kind === "finding") return false;
      const node = row.referenceModelNodeId ? nodesById.get(row.referenceModelNodeId) : undefined;
      if (!node) return true;
      const branch = getGraphPresentationState(node).branch;
      return !branch || graphFilters[branch];
    })
    .forEach((row) => {
      const node = row.referenceModelNodeId ? nodesById.get(row.referenceModelNodeId) : undefined;
      const nodeFindings = row.referenceModelNodeId ? findingsByNode.get(row.referenceModelNodeId) ?? [] : [];
      const processingStatus = row.referenceModelNodeId ? processingStateByTreeNodeId.get(row.referenceModelNodeId) : undefined;
      const allTerminal = nodeFindings.length > 0 && nodeFindings.every((finding) => finding.status !== "pending");
      const live = Boolean(row.referenceModelNodeId && liveSeen.has(row.referenceModelNodeId));
      const cached = processingStatus === "cached" || processingStatus === "verified" || processingStatus === "revision-mismatch" || processingStatus === "unverified";
      const journeyStage: JourneyStage = allTerminal ? "tested" : live ? "live" : cached ? "cached" : "referenced";

      results.push({
        ...row,
        collapseKey: node ? getGraphPresentationState(node).collapseKey : undefined,
        journeyStage,
        sitecoreUrl: node?.nodeType === "item"
          ? (() => {
              const identity = node.scItem.scItemId ?? node.scItem.scItemPath;
              return identity ? buildFoblesUrl(identity) : undefined;
            })()
          : undefined,
        isSitecoreItem: node?.nodeType === "item",
        findings: nodeFindings,
        searchText: [row.label, node?.nodeType === "item" ? node.scItem.scItemName : undefined, node?.nodeType === "item" ? node.scItem.scItemId : undefined, node?.nodeType === "item" ? node.scItem.scItemPath : undefined]
          .filter((value): value is string => Boolean(value))
          .join(" ")
          .toLowerCase(),
      });
    });

  setVisibleChildren(results);
  rollupJourney(results);
  return results;
}

function setVisibleChildren(rows: AuditorTreeRow[]): void {
  const childCountByParent = new Map<string, number>();

  rows.forEach((row) => {
    if (row.parentId) childCountByParent.set(row.parentId, (childCountByParent.get(row.parentId) ?? 0) + 1);
  });

  rows.forEach((row) => {
    row.hasChildren = (childCountByParent.get(row.id) ?? 0) > 0;
  });
}

function rollupJourney(rows: AuditorTreeRow[]): void {
  const childrenByParent = new Map<string, AuditorTreeRow[]>();

  rows.forEach((row) => {
    if (!row.parentId) return;

    const children = childrenByParent.get(row.parentId) ?? [];
    children.push(row);
    childrenByParent.set(row.parentId, children);
  });

  function rollup(row: AuditorTreeRow): number | undefined {
    const ownRank = row.isSitecoreItem ? JOURNEY_RANK[row.journeyStage] : undefined;
    const childRanks = (childrenByParent.get(row.id) ?? []).map(rollup);
    const ranks = [ownRank, ...childRanks].filter((rank): rank is number => rank !== undefined);
    const rank = ranks.length > 0 ? Math.min(...ranks) : undefined;

    if (rank !== undefined) row.journeyStage = JOURNEY_BY_RANK[rank];
    return rank;
  }

  rows.filter((row) => !row.parentId).forEach(rollup);
}
