// @source-path [fobles] src/content/features/reference-graph/hooks/use-cytoscape.ts

import type { UseCytoscapeOptions } from "./hooks.types.js";
import { useEffect } from "react";
import { createGraphRuntime, disposeGraphRuntime, initializeGraphRuntime } from "../cytoscape/graph-runtime";

export function useCytoscape(options: UseCytoscapeOptions): void {
  useEffect(() => {
    const runtime = createGraphRuntime(options);
    void initializeGraphRuntime(runtime);
    return () => {
      disposeGraphRuntime(runtime);
    };
  }, [
    options.containerRef,
    options.currentFiltersRef,
    options.currentPreparedGraphRef,
    options.cyRef,
    options.doc,
    options.graphHistoryRef,
    options.harvestForLink,
    options.initialPreparedGraph,
    options.layoutPresetNameRef,
    options.loadedFiltersByItemIdRef,
    options.parameterVisibilitySettingsRef,
    options.renderGraph,
    options.setBuildElapsedSeconds,
    options.setCurrentFilters,
    options.setEnrichmentProgress,
    options.setGraphBusy,
    options.setHistoryCount,
    options.setLayoutPresetName,
    options.setParameterVisibilitySettings,
    options.setSelectedTreeNodeId,
    options.workSession,
  ]);
}
