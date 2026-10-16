// @source-path [Fobles] src/content/features/reference-graph/hooks/use-reference-graph.ts

import {
  useRef,
  useState,
} from "react";
import { CONST } from "../../../../constants/const";
import type {
  SitecoreHarvestFiltersState,
} from "../../../sitecore-harvester/sitecore-harvester.types";
import {
  DEFAULT_RENDERING_GRAPH_FILTERS_STATE,
} from "../graph-filters";
import {
  DEFAULT_GRAPH_PARAMETER_VISIBILITY_SETTINGS,
  type GraphParameterVisibilitySettings,
} from "../graph-parameter-visibility-settings";
import type { EnrichmentProgress } from "../enrichment/enrichment.types";
import type {
  LayoutGraphPresetName,
} from "../graph.types";
import type {
  PreparedReferenceGraph,
} from "../prepared-reference-graph.types";

type UseReferenceGraphOptions = {
  initialPreparedGraph: PreparedReferenceGraph;
};

type MutableRef<T> = {
  current: T;
};

export type GraphState = {
  currentPreparedGraph: PreparedReferenceGraph;
  setCurrentPreparedGraph: React.Dispatch<
    React.SetStateAction<PreparedReferenceGraph>
  >;
  currentPreparedGraphRef:
    MutableRef<PreparedReferenceGraph>;

  currentFilters: SitecoreHarvestFiltersState;
  setCurrentFilters: React.Dispatch<
    React.SetStateAction<SitecoreHarvestFiltersState>
  >;
  currentFiltersRef:
    MutableRef<SitecoreHarvestFiltersState>;

  parameterVisibilitySettings:
    GraphParameterVisibilitySettings;
  setParameterVisibilitySettings: React.Dispatch<
    React.SetStateAction<GraphParameterVisibilitySettings>
  >;
  parameterVisibilitySettingsRef:
    MutableRef<GraphParameterVisibilitySettings>;

  layoutPresetName: LayoutGraphPresetName;
  setLayoutPresetName: React.Dispatch<
    React.SetStateAction<LayoutGraphPresetName>
  >;
  layoutPresetNameRef:
    MutableRef<LayoutGraphPresetName>;

  historyCount: number;
  setHistoryCount: React.Dispatch<
    React.SetStateAction<number>
  >;

  graphHistoryRef:
    MutableRef<PreparedReferenceGraph[]>;

  loadedFiltersByItemIdRef:
    MutableRef<
      Map<
        string,
        Set<keyof SitecoreHarvestFiltersState>
      >
    >;

  buildElapsedSeconds:
    number | undefined;
  setBuildElapsedSeconds: React.Dispatch<
    React.SetStateAction<number | undefined>
  >;

  controlsExpanded: boolean;
  setControlsExpanded: React.Dispatch<
    React.SetStateAction<boolean>
  >;

  treeDataVisible: boolean;
  setTreeDataVisible: React.Dispatch<
    React.SetStateAction<boolean>
  >;

  selectedTreeNodeId:
    string | undefined;
  setSelectedTreeNodeId: React.Dispatch<
    React.SetStateAction<string | undefined>
  >;

  enrichmentProgress:
    EnrichmentProgress | undefined;
  setEnrichmentProgress: React.Dispatch<
    React.SetStateAction<EnrichmentProgress | undefined>
  >;
};

export function useReferenceGraph({
  initialPreparedGraph,
}: UseReferenceGraphOptions): GraphState {
  const [
    currentPreparedGraph,
    setCurrentPreparedGraph,
  ] = useState(initialPreparedGraph);

  const currentPreparedGraphRef:
    MutableRef<PreparedReferenceGraph> =
    useRef(initialPreparedGraph);

  const [
    treeDataVisible,
    setTreeDataVisible,
  ] = useState(false);

  const [
    selectedTreeNodeId,
    setSelectedTreeNodeId,
  ] = useState<string | undefined>(
    undefined,
  );

  const [
    enrichmentProgress,
    setEnrichmentProgress,
  ] = useState<EnrichmentProgress | undefined>(
    undefined,
  );

  const [
    currentFilters,
    setCurrentFilters,
  ] =
    useState<SitecoreHarvestFiltersState>(
      DEFAULT_RENDERING_GRAPH_FILTERS_STATE,
    );

  const currentFiltersRef:
    MutableRef<SitecoreHarvestFiltersState> =
    useRef(
      DEFAULT_RENDERING_GRAPH_FILTERS_STATE,
    );

  const [
    parameterVisibilitySettings,
    setParameterVisibilitySettings,
  ] =
    useState<GraphParameterVisibilitySettings>({
      ...DEFAULT_GRAPH_PARAMETER_VISIBILITY_SETTINGS,
    });

  const parameterVisibilitySettingsRef:
    MutableRef<GraphParameterVisibilitySettings> =
    useRef({
      ...DEFAULT_GRAPH_PARAMETER_VISIBILITY_SETTINGS,
    });

  const [
    layoutPresetName,
    setLayoutPresetName,
  ] =
    useState<LayoutGraphPresetName>(
      CONST.FOBLES.REFERENCE_GRAPH
        .DEFAULT_LAYOUT_PRESET_NAME,
    );

  const layoutPresetNameRef:
    MutableRef<LayoutGraphPresetName> =
    useRef<LayoutGraphPresetName>(
      CONST.FOBLES.REFERENCE_GRAPH
        .DEFAULT_LAYOUT_PRESET_NAME,
    );

  const [
    historyCount,
    setHistoryCount,
  ] = useState(0);

  const graphHistoryRef:
    MutableRef<PreparedReferenceGraph[]> =
    useRef<PreparedReferenceGraph[]>([]);

  const loadedFiltersByItemIdRef:
    MutableRef<
      Map<
        string,
        Set<keyof SitecoreHarvestFiltersState>
      >
    > =
    useRef(
      new Map<
        string,
        Set<keyof SitecoreHarvestFiltersState>
      >(),
    );

  const [
    buildElapsedSeconds,
    setBuildElapsedSeconds,
  ] = useState<
    number | undefined
  >(undefined);

  const [
    controlsExpanded,
    setControlsExpanded,
  ] = useState(true);

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
  };
}