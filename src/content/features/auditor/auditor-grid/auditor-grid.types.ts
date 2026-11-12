// @source-path [fobles] src/content/features/auditor/auditor-grid/auditor-grid.types.ts

import type { GraphCollapseKey } from "../../../foundation/reference-data/model/model.types";
import type { AuditFinding } from "../auditor.types";
import type { AuditReportTreeNode } from "../auditor.types";

export type JourneyStage = "referenced" | "cached" | "live" | "tested";

export type ToggleModifiers = { shiftKey?: boolean; ctrlKey?: boolean; metaKey?: boolean };

export type LabelParts = { name: string; qualifier: string | undefined };

export type AuditorTreeRow = AuditReportTreeNode & {
  collapseKey?: GraphCollapseKey;
  journeyStage: JourneyStage;
  sitecoreUrl?: string;
  isSitecoreItem: boolean;
  findings: readonly AuditFinding[];
  descendantFailures: readonly AuditorDescendantFailure[];
  searchText: string;
};

export type AuditorDescendantFailure = {
  rowId: string;
  label: string;
  hierarchy: readonly string[];
  findings: readonly AuditFinding[];
};

export type AuditorTestDetailsSelection = { row: AuditorTreeRow; ancestors: readonly AuditorTreeRow[] };
