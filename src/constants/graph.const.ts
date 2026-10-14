import type cytoscape from "cytoscape";
import type { SitecoreHarvestFiltersState } from "../content/sitecore-harvester/sitecore-harvester.types";
import type { LayoutGraphPresetName } from "../content/toolbar/reference-graph/graph.types";
import type { StepKey } from "../content/sitecore-harvester/sitecore-harvester.types";
import { _REFERENCE_GRAPH_BASE } from "./_base/_REFERENCE_GRAPH_BASE";

export type LayoutScope =
  (typeof REFERENCE_GRAPH.LAYOUT_SCOPE)[keyof typeof REFERENCE_GRAPH.LAYOUT_SCOPE];

export const REFERENCE_GRAPH = {
  DEBUG_BACKGROUND_HARVEST: false,
  BACKGROUND_HARVEST: {
    MESSAGE: {
      TYPE: {
        HARVEST_SITECORE_IN_BACKGROUND_TAB:
          "HARVEST_SITECORE_IN_BACKGROUND_TAB",
        SITECORE_HARVEST_PROGRESS: "SITECORE_HARVEST_PROGRESS",
        FOBLES_PERSIST_LOG: "FOBLES_PERSIST_LOG",
        SITECORE_HARVESTER_READY: "SITECORE_HARVESTER_READY",
        HARVEST_SITECORE: "HARVEST_SITECORE"
      },
    } as const,
  },
  TEXT: {
    BUILDING_REFERENCE_GRAPH: "Building reference graph...",
  },
  EDGE_IDS: {
    EDGE_LAYOUT: "edge-layout",
    CHILDREN: "edge-children",
    REFERRERS: "edge-referrers",
  },

  FILTER_CLASS: _REFERENCE_GRAPH_BASE.FILTER_CLASS,
  NODE_ID: {
    // Fixed structural wrapper nodes (the two layout XML sources everything else is parsed from, and
    // the Default device each currently wraps) rather than real Sitecore items, so they get plain
    // labels, not a kind prefix. Mirrors Sitecore's own Layout dialog: Renderings (Shared Layout) and
    // Final renderings (Final Layout) each have their own per-device tree, not one device shared by
    // both - only the Default device is harvested today (see reference-graph.ts), so that's the only
    // one nested under each; Mobile/Print/... would nest the exact same way once harvested.
    SHARED_LAYOUT_NODE_ID: "fobles-reference-graph-shared-layout",
    BASE_LAYOUT_NODE_ID: "fobles-reference-graph-layout-",
    SHARED_LAYOUT_DEVICE_NODE_ID:
      "fobles-reference-graph-shared-layout-device-default",
    FINAL_LAYOUT_NODE_ID: "fobles-reference-graph-final-layout",
    FINAL_LAYOUT_DEVICE_NODE_ID:
      "fobles-reference-graph-final-layout-device-default",
    // The one compound box everything above lives inside - its own self-contained subgraph (same
    // internal edges as before), with a single edge back to the root item crossing the box itself.
    MAIN_LAYOUT_BOX_NODE_ID: "fobles-reference-graph-layout-box",
  },
  LAYOUT_SCOPE: {
    DATASOURCE: "Datasource",
    PARAMETER: "Parameter",
    PARAMETERS: "Parameters",
    PLACEHOLDER: "Placeholder",
  } as const,
  NODE_KIND: _REFERENCE_GRAPH_BASE.NODE_KIND,
  KIND_COLORS: {
    // One distinct color per kind instead of the old flat "dashed = satellite" look - a structural
    // (non-identity) container cue, like the Section compound box's dashed border below, still
    // layers on top of this independently.
    [_REFERENCE_GRAPH_BASE.NODE_KIND.ITEM]: "#2f6fed",
    [_REFERENCE_GRAPH_BASE.NODE_KIND.DEVICE]: "#5a6b80",
    [_REFERENCE_GRAPH_BASE.NODE_KIND.CONTROL]: "#1f9d55",
    [_REFERENCE_GRAPH_BASE.NODE_KIND.DATASOURCE]: "#c9820f",
    [_REFERENCE_GRAPH_BASE.NODE_KIND.VARIANT]: "#8a3fd6",
    [_REFERENCE_GRAPH_BASE.NODE_KIND.TEMPLATE]: "#0f9aa0",
    [_REFERENCE_GRAPH_BASE.NODE_KIND.LAYOUTS]: "#9a5b1f",
    [_REFERENCE_GRAPH_BASE.NODE_KIND.SECTION]: "#555566",
    [_REFERENCE_GRAPH_BASE.NODE_KIND.PARENT]: "#b8860b",
    [_REFERENCE_GRAPH_BASE.NODE_KIND.CHILD]: "#d1428a",
    [_REFERENCE_GRAPH_BASE.NODE_KIND.REFERRER]: "#d13f3f",
    [_REFERENCE_GRAPH_BASE.NODE_KIND.FIELD]: "#7a7a7a",
    [_REFERENCE_GRAPH_BASE.NODE_KIND.PAGE_LAYOUT]: "#3a6a6a",
    [_REFERENCE_GRAPH_BASE.NODE_KIND.RENDERING_PARAMETER]: "#6a3a6a",
  } satisfies Record<string, string>,
  STRUCTURAL_COLOR: "#8a97a8", // Device/Shared Layout/Final Layout wrapper nodes
  DEFAULT_LAYOUT_PRESET_NAME: "dagre" as LayoutGraphPresetName,
  FILTER_DEFS: [
    {
      key: "parent",
      stepKey: "parent",
      label: "Parent",
      className: _REFERENCE_GRAPH_BASE.FILTER_CLASS.parent,
    },
    {
      key: "children",
      stepKey: "children",
      label: "Children",
      className: _REFERENCE_GRAPH_BASE.FILTER_CLASS.children,
    },
    {
      key: "layouts",
      stepKey: "layouts",
      label: "Layouts",
      className: _REFERENCE_GRAPH_BASE.FILTER_CLASS.layouts,
    },
    {
      key: "referrers",
      stepKey: "referrers",
      label: "Referrers",
      className: _REFERENCE_GRAPH_BASE.FILTER_CLASS.referrers,
    },
    {
      key: "sections",
      stepKey: "sections",
      label: "Sections",
      className: _REFERENCE_GRAPH_BASE.FILTER_CLASS.sections,
    },
    {
      key: "template",
      stepKey: "template",
      label: "Template",
      className: _REFERENCE_GRAPH_BASE.FILTER_CLASS.template,
    },
  ] as ReadonlyArray<{
    key: keyof SitecoreHarvestFiltersState;
    stepKey: StepKey;
    label: string;
    className: string;
  }>,
  DIALOG_ID: "fobles-reference-graph-dialog",
  PROGRESS_DIALOG_ID: "fobles-reference-graph-progress-dialog",
  PROGRESS_MESSAGE_ID: "fobles-reference-graph-progress-message",

  // None of these three extensions' option types are merged into cytoscape core's LayoutOptions
  // union (unlike cytoscape-popper's SingularData merge below) - each factory below casts its own
  // options object at the point of use, which is just filling that typing gap, not a real risk.
  LAYOUT_PRESETS: {
    dagre: {
      label: "Dagre (tree)",
      edgeStyle: "taxi",
      build: () =>
        ({
          name: "dagre",

          rankDir: "TB",
          align: "UL",

          ranker: "tight-tree",

          nodeSep: 25,
          rankSep: 50,
          edgeSep: 10,

          nodeDimensionsIncludeLabels: true,

          fit: true,
          padding: 20,
        }) as unknown as cytoscape.LayoutOptions,
    },
    "cose-bilkent": {
      label: "CoSE Bilkent (organic)",
      build: () =>
        ({
          name: "cose-bilkent",
          fit: true,
          edgeStyle: "bezier",
          padding: 20,
          animate: false,
          nodeRepulsion: 8000, // default 4500
          nodeDimensionsIncludeLabels: true,
        }) as unknown as cytoscape.LayoutOptions,
    },
    fcose: {
      label: "fCoSE (organic, fast)",
      build: () =>
        ({
          name: "fcose",
          edgeStyle: "bezier",
          fit: true,
          padding: 20,
        }) as unknown as cytoscape.LayoutOptions,
    },
    breadthfirst: {
      label: "Breadthfirst (tree, directed)",
      edgeStyle: "taxi",
      build: () =>
        ({
          name: "breadthfirst",
          directed: true,
          direction: "downward",
          circle: false,
          grid: false,

          spacingFactor: 1.25,
          avoidOverlap: true,
          nodeDimensionsIncludeLabels: true,

          fit: true,
          padding: 20,
        }) as unknown as cytoscape.LayoutOptions,
    },
  } as Record<LayoutGraphPresetName, LayoutPreset>,
  DEFAULT_LAYOUT_PRESET: { LayoutPresetName: "dagre" },
};

export type GraphEdgeStyle = "bezier" | "taxi";

export type LayoutPreset = {
  label: string;
  edgeStyle: GraphEdgeStyle;
  build: () => cytoscape.LayoutOptions;
};
