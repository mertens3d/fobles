// @source-path [fobles] src/constants/graph.const.ts

import type cytoscape from "cytoscape";
import type { LayoutGraphPresetName } from "../content/features/reference-graph/graph.types";
import type {
  SitecoreHarvestFiltersState,
  StepKey,
} from "../content/sitecore-harvester/sitecore-harvester.types";
import { _REFERENCE_GRAPH_BASE } from "./_base/_REFERENCE_GRAPH_BASE";
import type { LayoutPreset } from "./_base/const.types";

export const REFERENCE_GRAPH = {
  DEBUG_BACKGROUND_HARVEST: false,
  BACKGROUND_HARVEST: {
    MESSAGE: {
      TYPE: {
        FOBLES_PERSIST_LOG: "FOBLES_PERSIST_LOG",
        POOL_RUN_TASK: "POOL_RUN_TASK",
        POOL_CANCEL_REQUEST: "POOL_CANCEL_REQUEST",
        POOL_CANCEL_TASK: "POOL_CANCEL_TASK",
        WORKER_READY: "WORKER_READY",
        WORKER_TASK_EXECUTE: "WORKER_TASK_EXECUTE",
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
    SHARED_LAYOUT_NODE_ID: "fobles-reference-graph-shared-layout",
    BASE_LAYOUT_NODE_ID: "fobles-reference-graph-layout-",
    SHARED_LAYOUT_DEVICE_NODE_ID:
      "fobles-reference-graph-shared-layout-device-default",
    FINAL_LAYOUT_NODE_ID: "fobles-reference-graph-final-layout",
    FINAL_LAYOUT_DEVICE_NODE_ID:
      "fobles-reference-graph-final-layout-device-default",
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

  DOM: {
    IDS: {
      DIALOG_ID: "fobles-reference-graph-dialog",
      PROGRESS_DIALOG_ID: "fobles-reference-graph-progress-dialog",
    }
  },

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
          nodeRepulsion: 8000,
          nodeDimensionsIncludeLabels: true,
          randomize: false,
          initialEnergyOnIncremental: 0.2,
        }) as unknown as cytoscape.LayoutOptions,
    },

    fcose: {
      label: "fCoSE (organic, fast)",
      edgeStyle: "bezier",
      build: (_rootTreeNodeId: string) =>
        ({
          name: "fcose",
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

  DEFAULT_LAYOUT_PRESET: {
    LayoutPresetName: "dagre",
  },
};