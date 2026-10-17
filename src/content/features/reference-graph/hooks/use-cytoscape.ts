// @source-path [fobles] src/content/features/reference-graph/hooks/use-cytoscape.ts

import type cytoscape from "cytoscape";
import { useEffect } from "react";
import type {
  SitecoreHarvestFiltersState,
  SitecoreHarvestResult,
} from "../../../sitecore-harvester/sitecore-harvester.types";
import {
  createGraphRuntime,
  disposeGraphRuntime,
  initializeGraphRuntime,
  type MutableRef,
} from "../cytoscape/graph-runtime";
import type { EnrichmentProgress } from "../enrichment/enrichment.types";
import type { GraphParameterVisibilitySettings } from "../graph-parameter-visibility-settings";
import type {
  HarvestForLink,
  LayoutGraphPresetName,
} from "../graph.types";
import type { PreparedReferenceGraph } from "../prepared-reference-graph.types";

export type refReturn = {
  containerRef:
  MutableRef<HTMLDivElement | null>;
};

type UseCytoscapeOptions = {
  doc: Document;
  initialPreparedGraph: PreparedReferenceGraph;
  harvestForLink: HarvestForLink;
  containerRef:
  MutableRef<HTMLDivElement | null>;
  cyRef:
  MutableRef<cytoscape.Core | undefined>;
  currentPreparedGraphRef:
  MutableRef<PreparedReferenceGraph>;
  currentFiltersRef:
  MutableRef<SitecoreHarvestFiltersState>;
  parameterVisibilitySettingsRef:
  MutableRef<GraphParameterVisibilitySettings>;
  layoutPresetNameRef:
  MutableRef<LayoutGraphPresetName>;
  graphHistoryRef:
  MutableRef<PreparedReferenceGraph[]>;
  loadedFiltersByItemIdRef:
  MutableRef<
    Map<
      string,
      Set<
        keyof SitecoreHarvestFiltersState
      >
    >
  >;
  renderGraph: (
    graph: SitecoreHarvestResult,
  ) => Promise<void>;
  setCurrentFilters: (
    filters: SitecoreHarvestFiltersState,
  ) => void;
  setParameterVisibilitySettings: (
    settings:
      GraphParameterVisibilitySettings,
  ) => void;
  setLayoutPresetName: (
    name: LayoutGraphPresetName,
  ) => void;
  setHistoryCount: (
    count: number,
  ) => void;
  setBuildElapsedSeconds: (
    elapsedSeconds:
      number | undefined,
  ) => void;
  setSelectedTreeNodeId: (
    treeNodeId:
      string | undefined,
  ) => void;
  setEnrichmentProgress: (
    progress:
      EnrichmentProgress | undefined,
  ) => void;
  setGraphBusy: (
    busy: boolean,
  ) => void;
};

export function useCytoscape(
  options: UseCytoscapeOptions,
): void {
  const {
    containerRef,
    currentFiltersRef,
    currentPreparedGraphRef,
    cyRef,
    doc,
    graphHistoryRef,
    harvestForLink,
    initialPreparedGraph,
    layoutPresetNameRef,
    loadedFiltersByItemIdRef,
    parameterVisibilitySettingsRef,
    renderGraph,
    setBuildElapsedSeconds,
    setCurrentFilters,
    setEnrichmentProgress,
    setGraphBusy,
    setHistoryCount,
    setLayoutPresetName,
    setParameterVisibilitySettings,
    setSelectedTreeNodeId,
  } = options;

  useEffect(() => {
    const runtime =
      createGraphRuntime(options);

    void initializeGraphRuntime(
      runtime,
    );

    return () => {
      disposeGraphRuntime(
        runtime,
      );
    };
  }, [
    containerRef,
    currentFiltersRef,
    currentPreparedGraphRef,
    cyRef,
    doc,
    graphHistoryRef,
    harvestForLink,
    initialPreparedGraph,
    layoutPresetNameRef,
    loadedFiltersByItemIdRef,
    parameterVisibilitySettingsRef,
    renderGraph,
    setBuildElapsedSeconds,
    setCurrentFilters,
    setEnrichmentProgress,
    setGraphBusy,
    setHistoryCount,
    setLayoutPresetName,
    setParameterVisibilitySettings,
    setSelectedTreeNodeId,
  ]);
}