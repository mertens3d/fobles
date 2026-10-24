// @source-path [Fobles] src/content/features/reference-graph/hooks/use-reference-graph.ts

import { useRef, useState } from "react";
import { CONST } from "../../../../constants/const";
import type { SitecoreHarvestFiltersState } from "../../../sitecore-harvester/sitecore-harvester.types";
import type { EnrichmentProgress } from "../enrichment/enrichment.types";
import { DEFAULT_RENDERING_GRAPH_FILTERS_STATE } from "../graph-filters";
import {
  DEFAULT_GRAPH_PARAMETER_VISIBILITY_SETTINGS,
  type GraphParameterVisibilitySettings,
} from "../graph-parameter-visibility-settings";
import type { LayoutGraphPresetName } from "../graph.types";
import type { PhaseProgress } from "../lifecycle/lifecycle.types";
import type { PreparedReferenceGraph } from "../prepared-reference-graph.types";

type UseReferenceGraphOptions = {
  initialPreparedGraph: PreparedReferenceGraph;
};

type MutableRef<T> = { current: T };

export type GraphState = {
  currentPreparedGraph: PreparedReferenceGraph;
  setCurrentPreparedGraph: React.Dispatch<React.SetStateAction<PreparedReferenceGraph>>;
  currentPreparedGraphRef: MutableRef<PreparedReferenceGraph>;

  currentFilters: SitecoreHarvestFiltersState;
  setCurrentFilters: React.Dispatch<React.SetStateAction<SitecoreHarvestFiltersState>>;
  currentFiltersRef: MutableRef<SitecoreHarvestFiltersState>;

  parameterVisibilitySettings: GraphParameterVisibilitySettings;
  setParameterVisibilitySettings: React.Dispatch<
    React.SetStateAction<GraphParameterVisibilitySettings>
  >;
  parameterVisibilitySettingsRef: MutableRef<GraphParameterVisibilitySettings>;

  layoutPresetName: LayoutGraphPresetName;
  setLayoutPresetName: React.Dispatch<React.SetStateAction<LayoutGraphPresetName>>;
  layoutPresetNameRef: MutableRef<LayoutGraphPresetName>;

  historyCount: number;
  setHistoryCount: React.Dispatch<React.SetStateAction<number>>;
  graphHistoryRef: MutableRef<PreparedReferenceGraph[]>;
  loadedFiltersByItemIdRef: MutableRef<
    Map<string, Set<keyof SitecoreHarvestFiltersState>>
  >;

  buildElapsedSeconds: number | undefined;
  setBuildElapsedSeconds: React.Dispatch<React.SetStateAction<number | undefined>>;

  controlsExpanded: boolean;
  setControlsExpanded: React.Dispatch<React.SetStateAction<boolean>>;

  treeDataVisible: boolean;
  setTreeDataVisible: React.Dispatch<React.SetStateAction<boolean>>;

  selectedTreeNodeId: string | undefined;
  setSelectedTreeNodeId: React.Dispatch<React.SetStateAction<string | undefined>>;

  enrichmentProgress: EnrichmentProgress | undefined;
  setEnrichmentProgress: React.Dispatch<
    React.SetStateAction<EnrichmentProgress | undefined>
  >;

  harvestProgress: PhaseProgress | undefined;
  setHarvestProgress: React.Dispatch<
    React.SetStateAction<PhaseProgress | undefined>
  >;

  graphBusy: boolean;
  setGraphBusy: React.Dispatch<React.SetStateAction<boolean>>;
};

export function useReferenceGraph({
  initialPreparedGraph,
}: UseReferenceGraphOptions): GraphState {
  const [currentPreparedGraph, setCurrentPreparedGraph] = useState(initialPreparedGraph);
  const currentPreparedGraphRef = useRef(initialPreparedGraph);

  const [currentFilters, setCurrentFilters] =
    useState<SitecoreHarvestFiltersState>(DEFAULT_RENDERING_GRAPH_FILTERS_STATE);
  const currentFiltersRef = useRef(DEFAULT_RENDERING_GRAPH_FILTERS_STATE);

  const [parameterVisibilitySettings, setParameterVisibilitySettings] =
    useState<GraphParameterVisibilitySettings>({
      ...DEFAULT_GRAPH_PARAMETER_VISIBILITY_SETTINGS,
    });
  const parameterVisibilitySettingsRef = useRef({
    ...DEFAULT_GRAPH_PARAMETER_VISIBILITY_SETTINGS,
  });

  const [layoutPresetName, setLayoutPresetName] = useState<LayoutGraphPresetName>(
    CONST.FOBLES.REFERENCE_GRAPH.DEFAULT_LAYOUT_PRESET_NAME,
  );
  const layoutPresetNameRef = useRef<LayoutGraphPresetName>(
    CONST.FOBLES.REFERENCE_GRAPH.DEFAULT_LAYOUT_PRESET_NAME,
  );

  const [historyCount, setHistoryCount] = useState(0);
  const graphHistoryRef = useRef<PreparedReferenceGraph[]>([]);
  const loadedFiltersByItemIdRef = useRef<
    Map<string, Set<keyof SitecoreHarvestFiltersState>>
  >(new Map());

  const [buildElapsedSeconds, setBuildElapsedSeconds] =
    useState<number | undefined>(undefined);
  const [controlsExpanded, setControlsExpanded] = useState(true);
  const [treeDataVisible, setTreeDataVisible] = useState(false);
  const [selectedTreeNodeId, setSelectedTreeNodeId] =
    useState<string | undefined>(undefined);
  const [enrichmentProgress, setEnrichmentProgress] =
    useState<EnrichmentProgress | undefined>(undefined);
  const [harvestProgress, setHarvestProgress] =
    useState<PhaseProgress | undefined>(undefined);

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
    setTreeDataVisible,
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
