// @source-path [fobles] src/content/features/auditor/auditor-grid/auditor-grid.types.ts

import type { GraphCollapseKey } from "../../../foundation/reference-data/model/graph-collapse.types";
import type { AuditFinding } from "../audit-finding.types";
import type { AuditReportTreeNode } from "../audit-report-tree";

export type JourneyStage = "referenced" | "cached" | "live" | "tested";
export type ToggleModifiers = { shiftKey?: boolean; ctrlKey?: boolean; metaKey?: boolean };
export type LabelParts = { name: string; qualifier: string | undefined };

export type AuditorTreeRow = AuditReportTreeNode & {
  collapseKey?: GraphCollapseKey;
  journeyStage: JourneyStage;
  sitecoreUrl?: string;
  isSitecoreItem: boolean;
  findings: readonly AuditFinding[];
  searchText: string;
};
