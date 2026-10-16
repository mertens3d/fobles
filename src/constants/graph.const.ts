import type cytoscape from "cytoscape";
import type { SitecoreHarvestFiltersState } from "../content/sitecore-harvester/sitecore-harvester.types";
//import type { LayoutGraphPresetName } from "../content/features/reference-graph/graph.types";
import type { LayoutGraphPresetName } from "../content/features/reference-graph/graph.types";
import type { StepKey } from "../content/sitecore-harvester/sitecore-harvester.types";
import { _REFERENCE_GRAPH_BASE } from "./_base/_REFERENCE_GRAPH_BASE";

export type LayoutScope =
  (typeof REFERENCE_GRAPH.LAYOUT_SCOPE)[keyof typeof REFERENCE_GRAPH.LAYOUT_SCOPE];

export const REFERENCE_GRAPH = {
  DEBUG_BACKGROUND_HARVEST: false,
  BACKGROUND_HARVEST: {
    MESSAGE: {
      TYPE: {
        FOBLES_PERSIST_LOG: "FOBLES_PERSIST_LOG",
        // Foreground (any tab) -> service worker: run one WorkerTask on the pool, awaits the result.
        POOL_RUN_TASK: "POOL_RUN_TASK",
        // Foreground -> service worker: drop queued/active tasks for a requestId (fire-and-forget).
        POOL_CANCEL_REQUEST: "POOL_CANCEL_REQUEST",
        // Worker tab content script -> service worker: announces readiness after every (re)navigation.
        WORKER_READY: "WORKER_READY",
        // Service worker -> one specific worker tab: run a single WorkerTask, respond with WorkerTaskResult.
        WORKER_TASK_EXECUTE: "WORKER_TASK_EXECUTE",
        // Service worker -> one specific worker tab: best-effort abort of its currently active task.
        WORKER_TASK_CANCEL: "WORKER_TASK_CANCEL",
        WORKER_SET_OWNED: "FOBLES_REFERENCE_GRAPH_WORKER_SET_OWNED",
        POOL_DISPOSE: "FOBLES_REFERENCE_GRAPH_POOL_DISPOSE",
        WORKER_ADOPTED: "FOBLES_REFERENCE_GRAPH_WORKER_ADOPTED",
      },
    } as const,
  },
  WORKER_POOL: {
    MAX_WORKERS: 3,
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
      build: (_rootTreeNodeId: string) =>
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
      build: (_rootTreeNodeId: string) =>
        ({
          name: "cose-bilkent",
          fit: false,
          edgeStyle: "bezier",
          padding: 20,
          animate: false,
          nodeRepulsion: 8000, // default 4500
          nodeDimensionsIncludeLabels: true,
          randomize: false,
          initialEnergyOnIncremental: 0.2,

        }) as unknown as cytoscape.LayoutOptions,
    },
    fcose: {
      label: "fCoSE (organic, fast)",
      build: (_rootTreeNodeId: string) =>
        ({
          name: "fcose",
          edgeStyle: "bezier",
          fit: false,
          padding: 20,
          randomize: false,
          initialEnergyOnIncremental: 0.2,
        }) as unknown as cytoscape.LayoutOptions,
    },
    breadthfirst: {
      label: "Breadthfirst (tree, directed)",
      edgeStyle: "taxi",
      build: (rootTreeNodeId: string) =>
        ({
          name: "breadthfirst",
          directed: true,
          direction: "downward",
          roots: `[id = "${rootTreeNodeId}"]`,
          maximal: false,
          circle: false,
          grid: true,

          spacingFactor: 1.1,
          avoidOverlap: true,
          nodeDimensionsIncludeLabels: true,

          fit: false,
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
  build: (rootTreeNodeId: string) => cytoscape.LayoutOptions;

};
