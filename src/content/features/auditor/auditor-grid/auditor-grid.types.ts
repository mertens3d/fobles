// @source-path [fobles] src/content/features/auditor/auditor-grid/auditor-grid.types.ts

import type { SitecoreHarvestFiltersState } from "../../../../constants/_base/_base.types";
import type { SitecoreHarvestResult } from "../../../foundation/harvesting/harvesting.types";
import type { GraphCollapseKey, ReferenceModelBranch } from "../../../foundation/reference-data/model/model.types";
import type { AuditFinding } from "../auditor.types";
import type { AuditReportTreeNode } from "../auditor.types";

export type JourneyStage = "referenced" | "cached" | "live" | "tested";

export type ToggleModifiers = { shiftKey?: boolean; ctrlKey?: boolean; metaKey?: boolean };

export type LabelParts = { name: string; qualifier: string | undefined };

// Agent: "auditing" = not known yet, "complete" = known (count may be 0), "not-applicable" = nothing to audit
// Agent: (e.g. an item with no layout), "failed" = the data never arrived although auditing has settled.
export type AuditorGroupLoadState = "auditing" | "complete" | "failed" | "not-applicable";

export type AuditorGroupCount = { available: number; shown: number };

export type AuditorGroupStatus = {
  noun: string;
  state: AuditorGroupLoadState;
  count?: AuditorGroupCount;
  note?: string;
};

export type AuditorPlaceholderKind = "auditing" | "empty" | "failed";

export type AuditorGroupStatusContext = {
  graphFilters: SitecoreHarvestFiltersState;
  rootHarvest: SitecoreHarvestResult;
  settled: boolean;
};

export type AuditorGroupDefinition = {
  branch: ReferenceModelBranch;
  collapseKey: GraphCollapseKey;
  label: string;
  noun: string;
};

export type AuditorGroupCountRule = {
  countedCollapseKey: GraphCollapseKey;
  countsSitecoreItems: boolean;
  noun: string | undefined;
};

export type AuditorTreeRow = AuditReportTreeNode & {
  journeyStage: JourneyStage;
  isSitecoreItem: boolean;
  findings: readonly AuditFinding[];
  descendantFailures: readonly AuditorDescendantFailure[];
  searchText: string;
  branch?: ReferenceModelBranch;
  collapseKey?: GraphCollapseKey;
  groupStatus?: AuditorGroupStatus;
  placeholder?: AuditorPlaceholderKind;
  sitecoreUrl?: string;
};

export type AuditorRowsByParentId = ReadonlyMap<string, readonly AuditorTreeRow[]>;

export type AuditorFailureOccurrence = { rowId: string; hierarchy: readonly string[] };

// Agent: One unique failing finding below a row (same check, status, item and summary), with every place it occurs.
export type AuditorDescendantFailure = {
  key: string;
  label: string;
  finding: AuditFinding;
  occurrences: readonly AuditorFailureOccurrence[];
};

export type AuditorTestDetailsSelection = { row: AuditorTreeRow; ancestors: readonly AuditorTreeRow[] };
