// @source-path [fobles] src/content/features/reference-graph/graph.types.ts
import type cytoscape from "cytoscape";
import type { WorkSession } from "../../foundation/workers/session/work-session.types";
import type { SitecoreHarvestFiltersState, SitecoreHarvestResult } from "../../foundation/harvesting/sitecore-harvester.types";
import type { EnrichmentProgress } from "./enrichment/enrichment.types";
import type { GraphParameterVisibilitySettings } from "./graph-parameter-visibility-settings";
import type { getGraphViewportState } from "./graph-viewport-settings";
import type { PreparedReferenceGraph } from "./prepared-reference-graph.types";
export type GlyphState = "expanded" | "collapsed" | "leaf";
export type LayoutPreset = { label: string; build: () => cytoscape.LayoutOptions; };
export type LayoutGraphPresetName = "dagre" | "cose-bilkent" | "fcose" | "breadthfirst";
export type HarvestForLink = (link: string, filters: SitecoreHarvestFiltersState, existingResult?: SitecoreHarvestResult) => Promise<SitecoreHarvestResult | undefined>;
export type MutableRef<T> = { current: T; };
export type GraphRuntimeOptions = {
  doc: Document; workSession: WorkSession; initialPreparedGraph: PreparedReferenceGraph; harvestForLink: HarvestForLink;
  containerRef: MutableRef<HTMLDivElement | null>; cyRef: MutableRef<cytoscape.Core | undefined>; currentPreparedGraphRef: MutableRef<PreparedReferenceGraph>;
  currentFiltersRef: MutableRef<SitecoreHarvestFiltersState>; parameterVisibilitySettingsRef: MutableRef<GraphParameterVisibilitySettings>; layoutPresetNameRef: MutableRef<LayoutGraphPresetName>;
  graphHistoryRef: MutableRef<PreparedReferenceGraph[]>; loadedFiltersByItemIdRef: MutableRef<Map<string, Set<keyof SitecoreHarvestFiltersState>>>;
  renderGraph: (graph: SitecoreHarvestResult) => Promise<void>; setCurrentFilters: (filters: SitecoreHarvestFiltersState) => void;
  setParameterVisibilitySettings: (settings: GraphParameterVisibilitySettings) => void; setLayoutPresetName: (name: LayoutGraphPresetName) => void; setHistoryCount: (count: number) => void;
  setBuildElapsedSeconds: (elapsedSeconds: number | undefined) => void; setSelectedTreeNodeId: (treeNodeId: string | undefined) => void; setEnrichmentProgress: (progress: EnrichmentProgress | undefined) => void; setGraphBusy: (busy: boolean) => void;
};
export type SavedGraphSettings = { filters: SitecoreHarvestFiltersState; layoutPresetName: LayoutGraphPresetName; parameterVisibilitySettings: GraphParameterVisibilitySettings; viewport: Awaited<ReturnType<typeof getGraphViewportState>>; };
export type AnimationFrameState = { first: number | undefined; second: number | undefined; };
export type GraphRuntime = { options: GraphRuntimeOptions; container: HTMLDivElement | null; rootItemId: string; cy: cytoscape.Core | undefined; savedViewport: Awaited<ReturnType<typeof getGraphViewportState>>; animationFrames: AnimationFrameState; disposed: boolean; };
