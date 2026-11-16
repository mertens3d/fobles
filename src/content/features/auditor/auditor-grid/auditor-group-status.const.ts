// @source-path [fobles] src/content/features/auditor/auditor-grid/auditor-group-status.const.ts

import { GRAPH_COLLAPSE_KEY } from "../../../foundation/reference-data/model/model.const";
import type { GraphCollapseKey, ReferenceModelBranch } from "../../../foundation/reference-data/model/model.types";
import type { AuditorGroupCountRule, AuditorGroupDefinition, AuditorPlaceholderKind } from "./auditor-grid.types";

// Agent: Single-item branches the Reference Model hangs directly off the root. The Auditor wraps each in a group row
// Agent: of its own ("Parent (1)", "Template (1)") so every root-level row is a group.
export const AUDITOR_WRAPPED_GROUP_DEFINITIONS: readonly AuditorGroupDefinition[] = [
  { branch: "parent", collapseKey: GRAPH_COLLAPSE_KEY.PARENT, label: "Parent", noun: "parent" },
  { branch: "template", collapseKey: GRAPH_COLLAPSE_KEY.TEMPLATE, label: "Template", noun: "template" },
];

// Agent: Root-level groups the Auditor always shows while their filter is on, in the Reference Model's own
// Agent: child order. Parent and Template are wrapped groups (see above).
export const AUDITOR_GROUP_DEFINITIONS: readonly AuditorGroupDefinition[] = [
  { branch: "parent", collapseKey: GRAPH_COLLAPSE_KEY.PARENT, label: "Parent", noun: "parent" },
  { branch: "children", collapseKey: GRAPH_COLLAPSE_KEY.CHILDREN, label: "Children", noun: "children" },
  { branch: "referrers", collapseKey: GRAPH_COLLAPSE_KEY.REFERRERS, label: "Referrers", noun: "referrers" },
  {
    branch: "customFields",
    collapseKey: GRAPH_COLLAPSE_KEY.CUSTOM_FIELDS,
    label: "Custom Fields",
    noun: "custom fields",
  },
  {
    branch: "standardFields",
    collapseKey: GRAPH_COLLAPSE_KEY.STANDARD_FIELDS,
    label: "Standard Fields",
    noun: "standard fields",
  },
  { branch: "layouts", collapseKey: GRAPH_COLLAPSE_KEY.LAYOUTS, label: "Layouts", noun: "layouts" },
];

export const AUDITOR_BRANCH_ORDER: ReadonlyMap<ReferenceModelBranch, number> = new Map<ReferenceModelBranch, number>([
  ["parent", 0],
  ["template", 1],
  ["children", 2],
  ["referrers", 3],
  ["customFields", 4],
  ["standardFields", 5],
  ["layouts", 6],
]);

// Agent: Which groups get a count, and what they count. The count is the number of the thing named in the label
// Agent: (renderings anywhere below a layout section), not the number of direct children. Field link items share the
// Agent: FIELD collapse key, so field counts only count non-item rows. An undefined noun means "use the row label"
// Agent: (layout sections are named by their field, e.g. "Final renderings").
export const AUDITOR_GROUP_COUNT_RULES: ReadonlyMap<GraphCollapseKey, AuditorGroupCountRule> = new Map<
  GraphCollapseKey,
  AuditorGroupCountRule
>([
  [
    GRAPH_COLLAPSE_KEY.CHILDREN,
    { countedCollapseKey: GRAPH_COLLAPSE_KEY.CHILD, countsSitecoreItems: true, noun: "children" },
  ],
  [
    GRAPH_COLLAPSE_KEY.CUSTOM_FIELDS,
    { countedCollapseKey: GRAPH_COLLAPSE_KEY.FIELD, countsSitecoreItems: false, noun: "custom fields" },
  ],
  [
    GRAPH_COLLAPSE_KEY.LAYOUT_SECTION,
    { countedCollapseKey: GRAPH_COLLAPSE_KEY.RENDERING, countsSitecoreItems: true, noun: undefined },
  ],
  [
    GRAPH_COLLAPSE_KEY.REFERRERS,
    { countedCollapseKey: GRAPH_COLLAPSE_KEY.REFERRER, countsSitecoreItems: true, noun: "referrers" },
  ],
  [
    GRAPH_COLLAPSE_KEY.STANDARD_FIELDS,
    { countedCollapseKey: GRAPH_COLLAPSE_KEY.FIELD, countsSitecoreItems: false, noun: "standard fields" },
  ],
]);

export const AUDITOR_GROUP_COPY = {
  AUDITING_PREFIX: "Auditing",
  COUNT_SUFFIX_AUDITING: "auditing",
  EMPTY_PREFIX: "No",
  FAILED_PREFIX: "Couldn't audit",
  FOUND_SUFFIX: "found",
  NO_LAYOUT: "no layout",
} as const;

// Agent: AUDITING_DOTS_CYCLE_MS: one dot step is 400 ms, so "." -> ".." -> "..." takes 1.2 s per cycle.
export const AUDITOR_GROUP_STATUS = {
  AUDITING_DOTS_CYCLE_MS: 1200,
  PLACEHOLDER_ID_SUFFIX: "fobles-auditor-placeholder",
  WRAPPED_GROUP_ID_SUFFIX: "group",
  PLACEHOLDER_PREFIX_BY_KIND: {
    auditing: AUDITOR_GROUP_COPY.AUDITING_PREFIX,
    empty: AUDITOR_GROUP_COPY.EMPTY_PREFIX,
    failed: AUDITOR_GROUP_COPY.FAILED_PREFIX,
  } satisfies Readonly<Record<AuditorPlaceholderKind, string>>,
  UNKNOWN_BRANCH_ORDER: 99,
} as const;
