// @source-path [fobles] src/content/features/reference-graph/hooks/use-cytoscape.ts
import type cytoscape from "cytoscape";
import { useEffect } from "react";
import type { WorkSession } from "../../../foundation/workers/session/work-session.types";
import type { SitecoreHarvestFiltersState, SitecoreHarvestResult } from "../../../foundation/harvesting/sitecore-harvester.types";
import { createGraphRuntime, disposeGraphRuntime, initializeGraphRuntime } from "../cytoscape/graph-runtime";
import type { EnrichmentProgress } from "../enrichment/enrichment.types";
import type { GraphParameterVisibilitySettings } from "../graph-parameter-visibility-settings";
import type { HarvestForLink, LayoutGraphPresetName, MutableRef } from "../graph.types";
import type { PreparedReferenceGraph } from "../prepared-reference-graph.types";
export type refReturn = {
    containerRef: MutableRef<HTMLDivElement | null>;
};
type UseCytoscapeOptions = {
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
export function useCytoscape(options: UseCytoscapeOptions): void {
    useEffect(() => { const runtime = createGraphRuntime(options); void initializeGraphRuntime(runtime); return () => { disposeGraphRuntime(runtime); }; }, [options.containerRef, options.currentFiltersRef, options.currentPreparedGraphRef, options.cyRef, options.doc, options.graphHistoryRef, options.harvestForLink, options.initialPreparedGraph, options.layoutPresetNameRef, options.loadedFiltersByItemIdRef, options.parameterVisibilitySettingsRef, options.renderGraph, options.setBuildElapsedSeconds, options.setCurrentFilters, options.setEnrichmentProgress, options.setGraphBusy, options.setHistoryCount, options.setLayoutPresetName, options.setParameterVisibilitySettings, options.setSelectedTreeNodeId, options.workSession]);
}
