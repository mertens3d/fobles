export const GRAPH_COLLAPSE_KEY = {
  ROOT: "root",
  PARENT: "parent",
  CHILDREN: "children",
  CHILD: "child",
  TEMPLATE: "template",
  REFERRERS: "referrers",
  REFERRER: "referrer",
  SECTIONS: "sections",
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
} as const;

export type GraphCollapseKey =
  (typeof GRAPH_COLLAPSE_KEY)[keyof typeof GRAPH_COLLAPSE_KEY];

export type ExpandedByCollapseKey =
  Record<GraphCollapseKey, boolean>;

export const DEFAULT_EXPANDED_BY_COLLAPSE_KEY:
  ExpandedByCollapseKey = {
    [GRAPH_COLLAPSE_KEY.ROOT]: true,
    [GRAPH_COLLAPSE_KEY.PARENT]: true,
    [GRAPH_COLLAPSE_KEY.CHILDREN]: true,
    [GRAPH_COLLAPSE_KEY.CHILD]: true,
    [GRAPH_COLLAPSE_KEY.TEMPLATE]: true,

    [GRAPH_COLLAPSE_KEY.REFERRERS]: false,
    [GRAPH_COLLAPSE_KEY.REFERRER]: true,

    [GRAPH_COLLAPSE_KEY.SECTIONS]: false,
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
  };

export function isGraphCollapseKey(
  value: unknown,
): value is GraphCollapseKey {
  return (
    typeof value === "string" &&
    Object.values(GRAPH_COLLAPSE_KEY).some(
      (collapseKey) => collapseKey === value,
    )
  );
}