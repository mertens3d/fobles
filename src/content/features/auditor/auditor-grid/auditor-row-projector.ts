// @source-path [fobles] src/content/features/auditor/auditor-grid/auditor-row-projector.ts

import type { ReferenceModelNode } from "../../../foundation/reference-data/model/model.types";
import { buildFoblesUrl } from "../../../foundation/sitecore/fobles-url";
import { getGraphPresentationState } from "../../../foundation/reference-data/model/graph-presentation-state";
import type { ProcessingStateByTreeNodeId } from "../../../foundation/reference-data/processing/processing.types";
import type { SitecoreHarvestFiltersState } from "../../../../constants/_base/_base.types";
import type { AuditFinding } from "../auditor.types";
import { buildAuditReportTree } from "../audit-report-tree";
import { applyAuditorGroupStatus } from "./auditor-group-status";
import type {
  AuditorDescendantFailure,
  AuditorFailureOccurrence,
  AuditorGroupStatusContext,
  AuditorTreeRow,
  JourneyStage,
} from "./auditor-grid.types";

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
    if (!finding.referenceModelNodeId) {
      return;
    }

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
  groupStatusContext?: AuditorGroupStatusContext,
): AuditorTreeRow[] {
  const nodesById = indexReferenceModelNodes(referenceModelRoot);
  const findingsByNode = indexFindingsByNode(findings);
  const results: AuditorTreeRow[] = [];

  buildAuditReportTree(referenceModelRoot, findings, processingStateByTreeNodeId)
    .filter((row) => {
      if (row.kind === "finding") {
        return false;
      }
      const node = row.referenceModelNodeId ? nodesById.get(row.referenceModelNodeId) : undefined;
      if (!node) {
        return true;
      }
      const branch = getGraphPresentationState(node).branch;
      return !branch || graphFilters[branch];
    })
    .forEach((row) => {
      const node = row.referenceModelNodeId ? nodesById.get(row.referenceModelNodeId) : undefined;
      const nodeFindings = row.referenceModelNodeId ? (findingsByNode.get(row.referenceModelNodeId) ?? []) : [];
      const processingStatus = row.referenceModelNodeId
        ? processingStateByTreeNodeId.get(row.referenceModelNodeId)
        : undefined;
      const allTerminal = nodeFindings.length > 0 && nodeFindings.every((finding) => finding.status !== "pending");
      const live = Boolean(row.referenceModelNodeId && liveSeen.has(row.referenceModelNodeId));
      const cached =
        processingStatus === "cached" ||
        processingStatus === "verified" ||
        processingStatus === "revision-mismatch" ||
        processingStatus === "unverified";
      const journeyStage: JourneyStage = allTerminal ? "tested" : live ? "live" : cached ? "cached" : "referenced";

      results.push({
        ...row,
        branch: node ? getGraphPresentationState(node).branch : undefined,
        collapseKey: node ? getGraphPresentationState(node).collapseKey : undefined,
        journeyStage,
        sitecoreUrl:
          node?.nodeType === "item"
            ? (() => {
                const identity = node.scItem.scItemId ?? node.scItem.scItemPath;
                return identity ? buildFoblesUrl(identity) : undefined;
              })()
            : undefined,
        isSitecoreItem: node?.nodeType === "item",
        findings: nodeFindings,
        descendantFailures: [],
        searchText: [
          row.label,
          node?.nodeType === "item" ? node.scItem.scItemName : undefined,
          node?.nodeType === "item" ? node.scItem.scItemId : undefined,
          node?.nodeType === "item" ? node.scItem.scItemPath : undefined,
        ]
          .filter((value): value is string => Boolean(value))
          .join(" ")
          .toLowerCase(),
      });
    });

  const rows = applyAuditorGroupStatus(results, nodesById, groupStatusContext);
  setVisibleChildren(rows);
  populateDescendantFailures(rows);
  rollupJourney(rows);
  return rows;
}

function isFailure(finding: AuditFinding): boolean {
  return finding.status === "error" || finding.status === "warning";
}

function ancestorsOf(row: AuditorTreeRow, rowsById: ReadonlyMap<string, AuditorTreeRow>): AuditorTreeRow[] {
  const ancestors: AuditorTreeRow[] = [];
  let parent = row.parentId ? rowsById.get(row.parentId) : undefined;
  while (parent && !ancestors.includes(parent)) {
    ancestors.push(parent);
    parent = parent.parentId ? rowsById.get(parent.parentId) : undefined;
  }
  return ancestors;
}

// Agent: The same item failing the same check is one failure, wherever it was referenced from.
function failureKey(finding: AuditFinding, row: AuditorTreeRow): string {
  const identity = finding.itemId?.trim().toLowerCase() || finding.itemPath?.trim().toLowerCase() || row.id;
  return [finding.checkKey, finding.status, identity, finding.summary].join("|");
}

function recordOccurrence(
  failures: Map<string, AuditorDescendantFailure>,
  row: AuditorTreeRow,
  finding: AuditFinding,
  occurrence: AuditorFailureOccurrence,
): void {
  const key = failureKey(finding, row);
  const existing = failures.get(key);
  failures.set(key, existing
    ? { ...existing, occurrences: [...existing.occurrences, occurrence] }
    : { key, label: row.label, finding, occurrences: [occurrence] });
}

// Agent: Every ancestor lists each unique descendant failure once, with all the places it was found.
function populateDescendantFailures(rows: AuditorTreeRow[]): void {
  const rowsById = new Map(rows.map((row) => [row.id, row]));
  const failuresByAncestorId = new Map<string, Map<string, AuditorDescendantFailure>>();
  rows.forEach((sourceRow) => {
    const failing = sourceRow.findings.filter(isFailure);
    const ancestors = failing.length ? ancestorsOf(sourceRow, rowsById) : [];
    const hierarchy = [...ancestors.map((ancestor) => ancestor.label).reverse(), sourceRow.label];
    ancestors.forEach((ancestor) => {
      const failures = failuresByAncestorId.get(ancestor.id) ?? new Map<string, AuditorDescendantFailure>();
      failuresByAncestorId.set(ancestor.id, failures);
      failing.forEach((finding) => recordOccurrence(failures, sourceRow, finding, { rowId: sourceRow.id, hierarchy }));
    });
  });
  failuresByAncestorId.forEach((failures, ancestorId) => {
    const ancestor = rowsById.get(ancestorId);
    if (ancestor) {
      ancestor.descendantFailures = Array.from(failures.values());
    }
  });
}

function setVisibleChildren(rows: AuditorTreeRow[]): void {
  const childCountByParent = new Map<string, number>();

  rows.forEach((row) => {
    if (row.parentId) {
      childCountByParent.set(row.parentId, (childCountByParent.get(row.parentId) ?? 0) + 1);
    }
  });

  rows.forEach((row) => {
    row.hasChildren = (childCountByParent.get(row.id) ?? 0) > 0;
  });
}

function rollupJourney(rows: AuditorTreeRow[]): void {
  const childrenByParent = new Map<string, AuditorTreeRow[]>();

  rows.forEach((row) => {
    if (!row.parentId) {
      return;
    }

    const children = childrenByParent.get(row.parentId) ?? [];
    children.push(row);
    childrenByParent.set(row.parentId, children);
  });

  function rollup(row: AuditorTreeRow): number | undefined {
    const ownRank = row.isSitecoreItem ? JOURNEY_RANK[row.journeyStage] : undefined;
    const childRanks = (childrenByParent.get(row.id) ?? []).map(rollup);
    const ranks = [ownRank, ...childRanks].filter((rank): rank is number => rank !== undefined);
    const rank = ranks.length > 0 ? Math.min(...ranks) : undefined;

    if (rank !== undefined) {
      row.journeyStage = JOURNEY_BY_RANK[rank];
    }
    return rank;
  }

  rows.filter((row) => !row.parentId).forEach(rollup);
}
