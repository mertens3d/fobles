import type { SitecoreHarvestFiltersState } from "../../../constants/_base/_base.types";
import type { LayoutGraphPresetName } from "../../../constants/constants.types";
import type { HarvestProgressCallback, SitecoreHarvestResult } from "../../foundation/harvesting/sitecore-harvester.types";
import type { PreparedReferenceModel } from "../../foundation/reference-data/acquisition/acquisition.types";
import type { ProcessingStatus } from "../../foundation/reference-data/processing/processing.types";
import type { WorkSession } from "../../foundation/workers/session/work-session.types";
import type { EnrichmentProgress } from "./enrichment/enrichment.types";
import type { getGraphViewportState } from "./graph-viewport-settings";
import type cytoscape from "cytoscape";

export type GraphParameterVisibilitySettings = { hideEmptyParameters: boolean; hideNonGuidParameters: boolean };

export type GraphViewportState = { rootItemId: string; zoom: number; center: { x: number; y: number } };

export type LayoutPreset = { label: string; build: () => cytoscape.LayoutOptions };

export type HarvestForLink = (
  link: string,
  filters: SitecoreHarvestFiltersState,
  existingResult?: SitecoreHarvestResult,
) => Promise<SitecoreHarvestResult | undefined>;

export type MutableRef<T> = { current: T };

export type GraphRuntimeOptions = {
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

export type SavedGraphSettings = {
  filters: SitecoreHarvestFiltersState;
  layoutPresetName: LayoutGraphPresetName;
  parameterVisibilitySettings: GraphParameterVisibilitySettings;
  viewport: Awaited<ReturnType<typeof getGraphViewportState>>;
};

export type AnimationFrameState = { first: number | undefined; second: number | undefined };

export type GraphRuntime = {
  options: GraphRuntimeOptions;
  container: HTMLDivElement | null;
  rootItemId: string;
  cy: cytoscape.Core | undefined;
  savedViewport: Awaited<ReturnType<typeof getGraphViewportState>>;
  animationFrames: AnimationFrameState;
  disposed: boolean;
};

export type PrepareReferenceGraphOptions = {
  signal?: AbortSignal;
  // Not used while preparation is structural-only (enrichment runs separately, after the graph is built) - kept so
  // existing callers don't need to change.
  onProgress?: HarvestProgressCallback;
  // Seeds the root node's own trust badge from the root-cache-flow decision that produced this harvest result.
  rootProcessingState?: ProcessingStatus;
};

export type PreparedReferenceGraph = PreparedReferenceModel & { graphElements: cytoscape.ElementDefinition[] };

export type ReferenceGraphOperationState = "created" | "running" | "displaying" | "disposing" | "closed";
