import type { SitecoreHarvestFiltersState } from "../../../../constants/_base/_base.types";
import type { LayoutGraphPresetName } from "../../../../constants/constants.types";
import type { SitecoreHarvestResult } from "../../../foundation/harvesting/harvesting.types";
import type { PhaseProgress } from "../../../foundation/reference-data/progress/lifecycle.types";
import type { WorkSession } from "../../../foundation/workers/session/work-session.types";
import type { EnrichmentProgress } from "../enrichment/enrichment.types";
import type { GraphParameterVisibilitySettings, HarvestForLink, MutableRef, PreparedReferenceGraph } from "../reference-graph.types";
import type cytoscape from "cytoscape";

export type refReturn = { containerRef: MutableRef<HTMLDivElement | null> };

export type UseCytoscapeOptions = {
  doc: Document;
  workSession: WorkSession;
  initialPreparedGraph: PreparedReferenceGraph;
  harvestForLink: HarvestForLink;
  containerRef: MutableRef<HTMLDivElement | null>;
  cyRef: MutableRef<cytoscape.Core | undefined>;
  currentPreparedGraphRef: MutableRef<PreparedReferenceGraph>;
  currentFiltersRef: MutableRef<SitecoreHarvestFiltersState>;
  parameterVisibilitySettingsRef: MutableRef<GraphParameterVisibilitySettings>;
  layoutPresetNameRef: MutableRef<LayoutGraphPresetName>;
  graphHistoryRef: MutableRef<PreparedReferenceGraph[]>;
  loadedFiltersByItemIdRef: MutableRef<Map<string, Set<keyof SitecoreHarvestFiltersState>>>;
  renderGraph: (graph: SitecoreHarvestResult) => Promise<void>;
  setCurrentFilters: (filters: SitecoreHarvestFiltersState) => void;
  setParameterVisibilitySettings: (settings: GraphParameterVisibilitySettings) => void;
  setLayoutPresetName: (name: LayoutGraphPresetName) => void;
  setHistoryCount: (count: number) => void;
  setBuildElapsedSeconds: (elapsedSeconds: number | undefined) => void;
  setSelectedTreeNodeId: (treeNodeId: string | undefined) => void;
  setEnrichmentProgress: (progress: EnrichmentProgress | undefined) => void;
  setGraphBusy: (busy: boolean) => void;
};

export type UseReferenceGraphActionsOptions = {
  doc: Document;
  workSession: WorkSession;
  harvestForLink: HarvestForLink;
  cyRef: MutableRef<cytoscape.Core | undefined>;
  graphState: GraphState;
};

export type ReferenceGraphActions = {
  handleBack: () => void;
  handleClearFilters: () => void;
  handleControlsExpandedChange: (controlsExpanded: boolean) => void;
  handleFilterChange: (key: keyof SitecoreHarvestFiltersState, checked: boolean) => void;
  handleParameterVisibilityChange: (settings: GraphParameterVisibilitySettings) => void;
  handleLayoutChange: (value: LayoutGraphPresetName) => void;
  handleRelayout: () => void;
  renderGraph: (graph: SitecoreHarvestResult) => Promise<void>;
  handleViewReferenceModel: () => void;
  handleCloseReferenceModel: () => void;
};

export type UseReferenceGraphFilterActionsOptions = {
  doc: Document;
  harvestForLink: HarvestForLink;
  cyRef: MutableRef<cytoscape.Core | undefined>;
  graphState: GraphState;
  renderGraph: (graph: SitecoreHarvestResult) => Promise<void>;
};

export type ReferenceGraphFilterActions = {
  handleClearFilters: () => void;
  handleFilterChange: (key: keyof SitecoreHarvestFiltersState, checked: boolean) => void;
};

export type UseReferenceGraphRenderActionsOptions = {
  doc: Document;
  workSession: WorkSession;
  cyRef: MutableRef<cytoscape.Core | undefined>;
  graphState: GraphState;
};

export type ReferenceGraphRenderActions = {
  handleBack: () => void;
  renderGraph: (graph: SitecoreHarvestResult) => Promise<void>;
};

export type UseReferenceGraphViewActionsOptions = { cyRef: MutableRef<cytoscape.Core | undefined>; graphState: GraphState };

export type ReferenceGraphViewActions = {
  handleControlsExpandedChange: (controlsExpanded: boolean) => void;
  handleParameterVisibilityChange: (settings: GraphParameterVisibilitySettings) => void;
  handleLayoutChange: (value: LayoutGraphPresetName) => void;
  handleRelayout: () => void;
  handleViewReferenceModel: () => void;
  handleCloseReferenceModel: () => void;
};

export type UseReferenceGraphOptions = { initialPreparedGraph: PreparedReferenceGraph };

export type GraphState = {
  currentPreparedGraph: PreparedReferenceGraph;
  setCurrentPreparedGraph: React.Dispatch<React.SetStateAction<PreparedReferenceGraph>>;
  currentPreparedGraphRef: MutableRef<PreparedReferenceGraph>;

  currentFilters: SitecoreHarvestFiltersState;
  setCurrentFilters: React.Dispatch<React.SetStateAction<SitecoreHarvestFiltersState>>;
  currentFiltersRef: MutableRef<SitecoreHarvestFiltersState>;

  parameterVisibilitySettings: GraphParameterVisibilitySettings;
  setParameterVisibilitySettings: React.Dispatch<React.SetStateAction<GraphParameterVisibilitySettings>>;
  parameterVisibilitySettingsRef: MutableRef<GraphParameterVisibilitySettings>;

  layoutPresetName: LayoutGraphPresetName;
  setLayoutPresetName: React.Dispatch<React.SetStateAction<LayoutGraphPresetName>>;
  layoutPresetNameRef: MutableRef<LayoutGraphPresetName>;

  historyCount: number;
  setHistoryCount: React.Dispatch<React.SetStateAction<number>>;
  graphHistoryRef: MutableRef<PreparedReferenceGraph[]>;
  loadedFiltersByItemIdRef: MutableRef<Map<string, Set<keyof SitecoreHarvestFiltersState>>>;

  buildElapsedSeconds: number | undefined;
  setBuildElapsedSeconds: React.Dispatch<React.SetStateAction<number | undefined>>;

  controlsExpanded: boolean;
  setControlsExpanded: React.Dispatch<React.SetStateAction<boolean>>;

  treeDataVisible: boolean;
  setReferenceModelVisible: React.Dispatch<React.SetStateAction<boolean>>;

  selectedTreeNodeId: string | undefined;
  setSelectedTreeNodeId: React.Dispatch<React.SetStateAction<string | undefined>>;

  enrichmentProgress: EnrichmentProgress | undefined;
  setEnrichmentProgress: React.Dispatch<React.SetStateAction<EnrichmentProgress | undefined>>;

  harvestProgress: PhaseProgress | undefined;
  setHarvestProgress: React.Dispatch<React.SetStateAction<PhaseProgress | undefined>>;

  graphBusy: boolean;
  setGraphBusy: React.Dispatch<React.SetStateAction<boolean>>;
};
