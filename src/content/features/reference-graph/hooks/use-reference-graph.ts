// @source-path [Fobles] src/content/features/reference-graph/hooks/use-reference-graph.ts

import { useRef, useState } from "react";
import type {
  SitecoreHarvestFiltersState,
  SitecoreHarvestResult,
} from "../../../sitecore-harvester/sitecore-harvester.types";
import { DEFAULT_RENDERING_GRAPH_FILTERS_STATE } from "../graph-filters";
import type { LayoutGraphPresetName } from "../graph.types";
import { CONST } from "../../../../constants/const";

type UseReferenceGraphOptions = {
  initialGraph: SitecoreHarvestResult;
};

type MutableRef<T> = {
  current: T;
};

export type GraphState = {
  currentGraph: SitecoreHarvestResult;
  setCurrentGraph: React.Dispatch<React.SetStateAction<SitecoreHarvestResult>>;
  currentGraphRef: MutableRef<SitecoreHarvestResult>;

  currentFilters: SitecoreHarvestFiltersState;
  setCurrentFilters: React.Dispatch<
    React.SetStateAction<SitecoreHarvestFiltersState>
  >;
  currentFiltersRef: MutableRef<SitecoreHarvestFiltersState>;

  layoutPresetName: LayoutGraphPresetName;
  setLayoutPresetName: React.Dispatch<
    React.SetStateAction<LayoutGraphPresetName>
  >;
  layoutPresetNameRef: MutableRef<LayoutGraphPresetName>;

  historyCount: number;
  setHistoryCount: React.Dispatch<React.SetStateAction<number>>;
  graphHistoryRef: MutableRef<SitecoreHarvestResult[]>;

  loadedFiltersByItemIdRef: MutableRef<
    Map<string, Set<keyof SitecoreHarvestFiltersState>>
  >;

  buildElapsedSeconds: number | undefined;
  setBuildElapsedSeconds: React.Dispatch<
    React.SetStateAction<number | undefined>
  >;

  controlsExpanded: boolean;
  setControlsExpanded: React.Dispatch<React.SetStateAction<boolean>>;

  treeDataVisible: boolean;
  setTreeDataVisible: React.Dispatch<React.SetStateAction<boolean>>;
};

export function useReferenceGraph({
  initialGraph,
}: UseReferenceGraphOptions): GraphState {
  const [currentGraph, setCurrentGraph] = useState(initialGraph);

  const currentGraphRef: MutableRef<SitecoreHarvestResult> =
    useRef(initialGraph);

  const [treeDataVisible, setTreeDataVisible] = useState(false);

  const [currentFilters, setCurrentFilters] =
    useState<SitecoreHarvestFiltersState>(
      DEFAULT_RENDERING_GRAPH_FILTERS_STATE,
    );

  const currentFiltersRef: MutableRef<SitecoreHarvestFiltersState> = useRef(
    DEFAULT_RENDERING_GRAPH_FILTERS_STATE,
  );

  const [layoutPresetName, setLayoutPresetName] =
    useState<LayoutGraphPresetName>(
      CONST.FOBLES.REFERENCE_GRAPH.DEFAULT_LAYOUT_PRESET_NAME,
    );

  const layoutPresetNameRef: MutableRef<LayoutGraphPresetName> =
    useRef<LayoutGraphPresetName>(
      CONST.FOBLES.REFERENCE_GRAPH.DEFAULT_LAYOUT_PRESET_NAME,
    );

  const [historyCount, setHistoryCount] = useState(0);

  const graphHistoryRef: MutableRef<SitecoreHarvestResult[]> = useRef<
    SitecoreHarvestResult[]
  >([]);

  const loadedFiltersByItemIdRef: MutableRef<
    Map<string, Set<keyof SitecoreHarvestFiltersState>>
  > = useRef(new Map<string, Set<keyof SitecoreHarvestFiltersState>>());

  const [buildElapsedSeconds, setBuildElapsedSeconds] = useState<
    number | undefined
  >(undefined);

  const [controlsExpanded, setControlsExpanded] = useState(true);

  return {
    currentGraph,
    setCurrentGraph,
    currentGraphRef,

    currentFilters,
    setCurrentFilters,
    currentFiltersRef,

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
  };
}
