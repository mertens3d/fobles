import type { GraphState } from "./hooks.types.js";
import type { UseReferenceGraphOptions } from "./hooks.types.js";
// @source-path [Fobles] src/content/features/reference-graph/hooks/use-reference-graph.ts

import { useRef, useState } from "react";
import { CONST } from "../../../../constants/const";
import type { SitecoreHarvestFiltersState } from "../../../../constants/_base/_base.types";
import type { EnrichmentProgress } from "../enrichment/enrichment.types";
import { DEFAULT_RENDERING_GRAPH_FILTERS_STATE } from "../graph-filters";
import { DEFAULT_GRAPH_PARAMETER_VISIBILITY_SETTINGS } from "../graph-parameter-visibility-settings";
import type { GraphParameterVisibilitySettings } from "../reference-graph.types";
import type { LayoutGraphPresetName } from "../../../../constants/constants.types";
import type { PreparedReferenceGraph } from "../reference-graph.types";
import type { PhaseProgress } from "../../../foundation/reference-data/progress/lifecycle.types";

export function useReferenceGraph({ initialPreparedGraph }: UseReferenceGraphOptions): GraphState {
  const [currentPreparedGraph, setCurrentPreparedGraph] = useState(initialPreparedGraph);
  const currentPreparedGraphRef = useRef(initialPreparedGraph);

  const [currentFilters, setCurrentFilters] = useState<SitecoreHarvestFiltersState>(
    DEFAULT_RENDERING_GRAPH_FILTERS_STATE,
  );
  const currentFiltersRef = useRef(DEFAULT_RENDERING_GRAPH_FILTERS_STATE);

  const [parameterVisibilitySettings, setParameterVisibilitySettings] = useState<GraphParameterVisibilitySettings>({
    ...DEFAULT_GRAPH_PARAMETER_VISIBILITY_SETTINGS,
  });
  const parameterVisibilitySettingsRef = useRef({ ...DEFAULT_GRAPH_PARAMETER_VISIBILITY_SETTINGS });

  const [layoutPresetName, setLayoutPresetName] = useState<LayoutGraphPresetName>(
    CONST.FOBLES.REFERENCE_GRAPH.DEFAULT_LAYOUT_PRESET_NAME,
  );
  const layoutPresetNameRef = useRef<LayoutGraphPresetName>(CONST.FOBLES.REFERENCE_GRAPH.DEFAULT_LAYOUT_PRESET_NAME);

  const [historyCount, setHistoryCount] = useState(0);
  const graphHistoryRef = useRef<PreparedReferenceGraph[]>([]);
  const loadedFiltersByItemIdRef = useRef<Map<string, Set<keyof SitecoreHarvestFiltersState>>>(new Map());

  const [buildElapsedSeconds, setBuildElapsedSeconds] = useState<number | undefined>(undefined);
  const [controlsExpanded, setControlsExpanded] = useState(true);
  const [treeDataVisible, setReferenceModelVisible] = useState(false);
  const [selectedTreeNodeId, setSelectedTreeNodeId] = useState<string | undefined>(undefined);
  const [enrichmentProgress, setEnrichmentProgress] = useState<EnrichmentProgress | undefined>(undefined);
  const [harvestProgress, setHarvestProgress] = useState<PhaseProgress | undefined>(undefined);

  const [graphBusy, setGraphBusy] = useState(true);

  return {
    currentPreparedGraph,
    setCurrentPreparedGraph,
    currentPreparedGraphRef,
    currentFilters,
    setCurrentFilters,
    currentFiltersRef,
    parameterVisibilitySettings,
    setParameterVisibilitySettings,
    parameterVisibilitySettingsRef,
    layoutPresetName,
    setLayoutPresetName,
    layoutPresetNameRef,
    historyCount,
    setHistoryCount,
    graphHistoryRef,
    loadedFiltersByItemIdRef,
    buildElapsedSeconds,
    setBuildElapsedSeconds,
    controlsExpanded,
    setControlsExpanded,
    treeDataVisible,
    setReferenceModelVisible,
    selectedTreeNodeId,
    setSelectedTreeNodeId,
    enrichmentProgress,
    setEnrichmentProgress,
    harvestProgress,
    setHarvestProgress,
    graphBusy,
    setGraphBusy,
  };
}
