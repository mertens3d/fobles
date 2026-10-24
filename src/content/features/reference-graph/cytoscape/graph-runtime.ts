// @source-path [fobles] src/content/features/reference-graph/cytoscape/graph-runtime.ts

import { CONST } from "../../../../constants/const";
import { getReferenceGraphFilters, getReferenceGraphLayoutName } from "../../../../shared/reference-graph-settings";
import { extensionLog } from "../../../logger";
import { closeReferenceGraphProgressModal, handleHarvestProgress } from "../build-progress";
import { disposeActiveEnrichmentController, startEnrichmentController } from "../enrichment/enrichment-controller";
import type { EnrichmentProgress } from "../enrichment/enrichment.types";
import { attachGraphEventHandlers } from "../event-handlers";
import { getEnabledFilterKeys } from "../graph-filters";
import { getGraphParameterVisibilitySettings } from "../graph-parameter-visibility-settings";
import {
  attachGraphExpandCollapse,
  detachGraphExpandCollapse,
  initializeGraphCollapseState,
  layoutInitialGraphVisibility,
  refreshGraphExpandCollapse,
} from "../graph-nodes/graph-expand-collapse";
import { setGraphParameterVisibility } from "../graph-nodes/graph-expand-collapse-view";
import { getGraphViewportState, restoreGraphViewportState, saveGraphViewportState } from "../graph-viewport-settings";
import type {
  AnimationFrameState,
  GraphRuntime,
  GraphRuntimeOptions,
  LayoutGraphPresetName,
  SavedGraphSettings,
} from "../graph.types";
import { finishReferenceGraphTimer } from "../reference-graph-timing";
import { cytoscapeFactory } from "./cytoscape-config";
import { REFERENCE_GRAPH_STYLE } from "./cytoscape-style";

export function createGraphRuntime(options: GraphRuntimeOptions): GraphRuntime {
  return {
    options,
    container: options.containerRef.current,
    rootItemId: options.initialPreparedGraph.harvestedData.rootItem.scItemId,
    cy: undefined,
    savedViewport: undefined,
    animationFrames: { first: undefined, second: undefined },
    disposed: false,
  };
}

export async function initializeGraphRuntime(runtime: GraphRuntime): Promise<void> {
  if (!runtime.container) return;

  const { options } = runtime;
  options.setGraphBusy(true);
  reportBuildProgress(options.doc, "active");

  try {
    const settings = await loadSavedGraphSettings();
    runtime.savedViewport = settings.viewport;

    extensionLog.debug("Reference graph initialization: settings loaded", {
      hasSavedViewport: Boolean(runtime.savedViewport),
      viewportRootMatches: runtime.savedViewport?.rootItemId === runtime.rootItemId,
      filters: settings.filters,
      layoutPresetName: settings.layoutPresetName,
      parameterVisibilitySettings: settings.parameterVisibilitySettings,
    });

    if (!runtime.disposed) {
      applySavedGraphSettings(runtime, settings);
      createGraphCore(runtime, settings);
      await attachGraphBehavior(runtime);
      if (!runtime.disposed) scheduleInitialLayout(runtime);
    }
  } catch (error) {
    handleInitializationFailure(runtime, error);
  }
}

export function disposeGraphRuntime(runtime: GraphRuntime): void {
  runtime.disposed = true;
  cancelScheduledLayout(runtime.animationFrames);

  const { cy, options } = runtime;

  if (cy) {
    void saveGraphViewportState(
      cy,
      options.currentPreparedGraphRef.current.harvestedData.rootItem.scItemId,
    );
    detachGraphExpandCollapse(cy);
    cy.destroy();
  }

  disposeActiveEnrichmentController();
  options.cyRef.current = undefined;
  runtime.cy = undefined;
}

function resolveLayoutPresetName(savedLayoutPresetName: LayoutGraphPresetName | undefined): LayoutGraphPresetName {
  let layoutPresetName = CONST.FOBLES.REFERENCE_GRAPH.DEFAULT_LAYOUT_PRESET_NAME;

  if (
    savedLayoutPresetName &&
    savedLayoutPresetName in CONST.FOBLES.REFERENCE_GRAPH.LAYOUT_PRESETS
  ) {
    layoutPresetName = savedLayoutPresetName;
  }

  return layoutPresetName;
}

async function loadSavedGraphSettings(): Promise<SavedGraphSettings> {
  const [filters, savedLayoutPresetName, parameterVisibilitySettings, viewport] = await Promise.all([
    getReferenceGraphFilters(),
    getReferenceGraphLayoutName(),
    getGraphParameterVisibilitySettings(),
    getGraphViewportState(),
  ]);

  return {
    filters,
    layoutPresetName: resolveLayoutPresetName(savedLayoutPresetName),
    parameterVisibilitySettings,
    viewport,
  };
}

function applySavedGraphSettings(runtime: GraphRuntime, settings: SavedGraphSettings): void {
  const { options, rootItemId } = runtime;

  options.currentFiltersRef.current = settings.filters;
  options.parameterVisibilitySettingsRef.current = settings.parameterVisibilitySettings;
  options.layoutPresetNameRef.current = settings.layoutPresetName;

  options.setCurrentFilters(settings.filters);
  options.setParameterVisibilitySettings(settings.parameterVisibilitySettings);
  options.setLayoutPresetName(settings.layoutPresetName);
  options.loadedFiltersByItemIdRef.current.set(rootItemId, getEnabledFilterKeys(settings.filters));
}

function createGraphCore(runtime: GraphRuntime, settings: SavedGraphSettings): void {
  const { container, options } = runtime;
  if (!container) return;

  const cy = cytoscapeFactory({
    container,
    elements: options.initialPreparedGraph.graphElements,
    layout: { name: "preset" },
    minZoom: 0.2,
    maxZoom: 3,
    style: REFERENCE_GRAPH_STYLE,
  });

  runtime.cy = cy;
  options.cyRef.current = cy;

  const iconNode = cy.nodes().filter((node) => Boolean(node.data("icon"))).first();

  if (iconNode.nonempty()) {
    extensionLog.debug("Reference graph icon diagnostic", {
      id: iconNode.id(),
      label: iconNode.data("label"),
      icon: iconNode.data("icon"),
      processingIcon: iconNode.data("processingIcon"),
      backgroundImage: iconNode.style("background-image"),
      backgroundWidth: iconNode.style("background-width"),
      backgroundHeight: iconNode.style("background-height"),
      backgroundPositionX: iconNode.style("background-position-x"),
      backgroundPositionY: iconNode.style("background-position-y"),
      backgroundFit: iconNode.style("background-fit"),
      backgroundClip: iconNode.style("background-clip"),
      backgroundRepeat: iconNode.style("background-repeat"),
    });
  }

  options.currentPreparedGraphRef.current = options.initialPreparedGraph;

  setGraphParameterVisibility(cy, settings.parameterVisibilitySettings);

  extensionLog.debug("Reference graph initialization: Cytoscape created", {
    nodeCount: cy.nodes().length,
    edgeCount: cy.edges().length,
    containerRect: container.getBoundingClientRect(),
  });
}

async function attachGraphBehavior(runtime: GraphRuntime): Promise<void> {
  const { cy, container, options } = runtime;
  if (!cy || !container) return;

  attachGraphEventHandlers(
    cy,
    container,
    options.harvestForLink,
    options.doc,
    () => options.currentFiltersRef.current,
    options.graphHistoryRef.current,
    () => options.currentPreparedGraphRef.current,
    options.renderGraph,
    options.setHistoryCount,
    options.setSelectedTreeNodeId,
  );

  await attachGraphExpandCollapse(
    cy,
    container,
    () => options.currentFiltersRef.current,
    () => options.layoutPresetNameRef.current,
    () => options.currentPreparedGraphRef.current.harvestedData.rootItem.scItemId,
  );

  refreshGraphExpandCollapse(cy);
}

function scheduleInitialLayout(runtime: GraphRuntime): void {
  runtime.animationFrames.first = requestAnimationFrame(() => {
    runtime.animationFrames.second = requestAnimationFrame(() => {
      runInitialLayout(runtime);
    });
  });
}

function runInitialLayout(runtime: GraphRuntime): void {
  const { cy } = runtime;
  if (runtime.disposed || !cy) return;

  cy.resize();
  initializeGraphCollapseState(cy);
  layoutInitialGraphVisibility(cy, () => completeInitialLayout(runtime));
}

function completeInitialLayout(runtime: GraphRuntime): void {
  const { cy, options, container } = runtime;
  if (runtime.disposed || !cy) return;

  const viewportRestored = restoreGraphViewportState(
    cy,
    runtime.rootItemId,
    runtime.savedViewport,
  );
  const visibleNodes = cy.nodes(":visible");
  const visibleEdges = cy.edges(":visible");

  extensionLog.debug("Reference graph initialization: layout complete", {
    nodeCount: cy.nodes().length,
    edgeCount: cy.edges().length,
    visibleNodeCount: visibleNodes.length,
    visibleEdgeCount: visibleEdges.length,
    hiddenNodeCount: cy.nodes().length - visibleNodes.length,
    viewportRestored,
    cySize: { width: cy.width(), height: cy.height() },
    containerRect: container?.getBoundingClientRect(),
    zoom: cy.zoom(),
    pan: cy.pan(),
    graphBoundingBox: cy.elements(":visible").boundingBox(),
  });

  options.setGraphBusy(false);
  startGraphEnrichment(runtime);
  reportBuildProgress(options.doc, "complete");
  closeReferenceGraphProgressModal(options.doc);

  extensionLog.debug("Reference graph ready", {
    nodeCount: cy.nodes().length,
    visibleNodeCount: visibleNodes.length,
  });
}

function startGraphEnrichment(runtime: GraphRuntime): void {
  const { options } = runtime;

  startEnrichmentController({
    doc: options.doc,
    dataTree: options.initialPreparedGraph.dataTree,
    nodesById: options.initialPreparedGraph.nodesById,
    getCy: () => options.cyRef.current,
    onProgress: (progress) => handleEnrichmentProgress(runtime, progress),
  });
}

function handleEnrichmentProgress(runtime: GraphRuntime, progress: EnrichmentProgress): void {
  const { options, cy } = runtime;
  options.setEnrichmentProgress(progress);

  if (!runtime.disposed && progress.status === "complete") {
    const elapsedSeconds = finishReferenceGraphTimer();
    options.setBuildElapsedSeconds(elapsedSeconds);

    extensionLog.debug("Reference graph complete", {
      nodeCount: cy?.nodes().length,
      visibleNodeCount: cy?.nodes(":visible").length,
      elapsedSeconds,
    });
  }
}

function reportBuildProgress(doc: Document, status: "active" | "complete"): void {
  handleHarvestProgress(doc, {
    stepKey: "build-graph",
    label: "Building Graph",
  }, status);
}

function handleInitializationFailure(runtime: GraphRuntime, error: unknown): void {
  runtime.options.setGraphBusy(false);
  closeReferenceGraphProgressModal(runtime.options.doc);
  extensionLog.error("Reference graph initialization failed", { error });
}

function cancelScheduledLayout(animationFrames: AnimationFrameState): void {
  if (animationFrames.first !== undefined) cancelAnimationFrame(animationFrames.first);
  if (animationFrames.second !== undefined) cancelAnimationFrame(animationFrames.second);
}