import type { ExpandedByCollapseKey } from "./model.types.ts";

export const GRAPH_COLLAPSE_KEY = {
  ROOT: "root",
  PARENT: "parent",
  CHILDREN: "children",
  CHILD: "child",
  TEMPLATE: "template",
  REFERRERS: "referrers",
  REFERRER: "referrer",
  CUSTOM_FIELDS: "customFields",
  STANDARD_FIELDS: "standardFields",
  SECTION: "section",
  FIELD: "field",
  LAYOUTS: "layouts",
  LAYOUT_SECTION: "layoutSection",
  DEVICE: "device",
  PAGE_LAYOUT: "pageLayout",
  PLACEHOLDER: "placeholder",
  RENDERING: "rendering",
  RENDERING_PARAMETERS: "renderingParameters",
  RENDERING_PARAMETER: "renderingParameter",
  DATASOURCE: "datasource",
  TESTS: "tests",
} as const;

export const DEFAULT_EXPANDED_BY_COLLAPSE_KEY: ExpandedByCollapseKey = {
  [GRAPH_COLLAPSE_KEY.ROOT]: true,
  [GRAPH_COLLAPSE_KEY.PARENT]: true,
  [GRAPH_COLLAPSE_KEY.CHILDREN]: true,
  [GRAPH_COLLAPSE_KEY.CHILD]: true,
  [GRAPH_COLLAPSE_KEY.TEMPLATE]: true,
  [GRAPH_COLLAPSE_KEY.REFERRERS]: false,
  [GRAPH_COLLAPSE_KEY.REFERRER]: true,
  [GRAPH_COLLAPSE_KEY.CUSTOM_FIELDS]: false,
  [GRAPH_COLLAPSE_KEY.STANDARD_FIELDS]: false,
  [GRAPH_COLLAPSE_KEY.SECTION]: true,
  [GRAPH_COLLAPSE_KEY.FIELD]: true,
  [GRAPH_COLLAPSE_KEY.LAYOUTS]: true,
  [GRAPH_COLLAPSE_KEY.LAYOUT_SECTION]: true,
  [GRAPH_COLLAPSE_KEY.DEVICE]: true,
  [GRAPH_COLLAPSE_KEY.PAGE_LAYOUT]: true,
  [GRAPH_COLLAPSE_KEY.PLACEHOLDER]: true,
  [GRAPH_COLLAPSE_KEY.RENDERING]: true,
  [GRAPH_COLLAPSE_KEY.RENDERING_PARAMETERS]: false,
  [GRAPH_COLLAPSE_KEY.RENDERING_PARAMETER]: true,
  [GRAPH_COLLAPSE_KEY.DATASOURCE]: true,
  [GRAPH_COLLAPSE_KEY.TESTS]: false,
};

// Caps on potentially-unbounded relationships included in the ReferenceModel. Only GUIDs actually
// represented in the resulting tree become enrichment candidates, so these limits also bound
// enrichment work, not just graph size.
export const REFERENCE_MODEL_FAN_OUT_LIMITS = { MAX_CHILDREN_PER_ITEM: 50, MAX_REFERRERS_PER_ITEM: 50 } as const;
