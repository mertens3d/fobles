import cytoscape from "cytoscape";
import { useEffect } from "react";
import { REFERENCE_GRAPH } from "../../../../constants/graph.const";
import {
    getReferenceGraphFilters,
    getReferenceGraphLayoutName,
} from "../../../../shared/reference-graph-settings";
import type {
    SitecoreHarvestFiltersState,
    SitecoreHarvestResult,
} from "../../../sitecore-harvester/sitecore-harvester.types";
import {
    closeReferenceGraphProgressModal,
    handleHarvestProgress,
} from "../build-progress";
import { REFERENCE_GRAPH_STYLE } from "../cytoscape/cytoscape-style";
import { runGraphLayout } from "../cytoscape/graph-layout";
import { attachGraphEventHandlers } from "../event-handlers";
import { buildElements } from "../graph-elements";
import { getEnabledFilterKeys } from "../graph-filters";
import { hideActiveTooltip } from "../graph-tooltip";
import type { LayoutGraphPresetName } from "../graph.types";
import { extensionLog } from "../../../logger";

type MutableRef<T> = {
    current: T;
};

export type refReturn = { containerRef: MutableRef<HTMLDivElement | null>; }

type UseCytoscapeOptions = {
    doc: Document;
    initialGraph: SitecoreHarvestResult;
    harvestForLink: (
        link: string,
        filters: SitecoreHarvestFiltersState,
    ) => Promise<SitecoreHarvestResult | undefined>;
    containerRef: MutableRef<HTMLDivElement | null>;
    cyRef: MutableRef<cytoscape.Core | undefined>;
    currentGraphRef: MutableRef<SitecoreHarvestResult>;
    currentFiltersRef: MutableRef<SitecoreHarvestFiltersState>;
    layoutPresetNameRef: MutableRef<LayoutGraphPresetName>;
    graphHistoryRef: MutableRef<SitecoreHarvestResult[]>;
    loadedFiltersByItemIdRef: MutableRef<
        Map<string, Set<keyof SitecoreHarvestFiltersState>>
    >;
    renderGraph: (graph: SitecoreHarvestResult) => void;
    setCurrentFilters: (
        filters: SitecoreHarvestFiltersState,
    ) => void;
    setLayoutPresetName: (
        name: LayoutGraphPresetName,
    ) => void;
    setHistoryCount: (count: number) => void;
};

export function useCytoscape({
    doc,
    initialGraph,
    harvestForLink,
    containerRef,
    cyRef,
    currentGraphRef,
    currentFiltersRef,
    layoutPresetNameRef,
    graphHistoryRef,
    loadedFiltersByItemIdRef,
    renderGraph,
    setCurrentFilters,
    setLayoutPresetName,
    setHistoryCount,
}: UseCytoscapeOptions): void {
    useEffect(() => {
        const container = containerRef.current;

        if (!container) {
            return;
        }

        handleHarvestProgress(
            doc,
            {
                stepKey: "build-graph",
                label: "Building Graph",
            },
            "active",
        );

        const initialElements = buildElements(initialGraph);

        const cy = cytoscape({
            container,
            elements: initialElements,
            layout: REFERENCE_GRAPH.LAYOUT_PRESETS[
                REFERENCE_GRAPH.DEFAULT_LAYOUT_PRESET_NAME
            ].build(),
            minZoom: 0.2,
            maxZoom: 3,
            style: REFERENCE_GRAPH_STYLE,
        });

        cyRef.current = cy;
        currentGraphRef.current = initialGraph;

        attachGraphEventHandlers(
            cy,
            container,
            harvestForLink,
            doc,
            () => currentFiltersRef.current,
            graphHistoryRef.current,
            () => currentGraphRef.current,
            renderGraph,
            setHistoryCount,
        );

        handleHarvestProgress(
            doc,
            {
                stepKey: "build-graph",
                label: "Building Graph",
            },
            "complete",
        );

        closeReferenceGraphProgressModal(doc);

        extensionLog.debug(
            "Reference graph: modal opened",
            {
                nodeCount: cy.nodes().length,
            },
        );

        void getReferenceGraphFilters().then((filters) => {
            currentFiltersRef.current = filters;
            setCurrentFilters(filters);

            loadedFiltersByItemIdRef.current.set(
                initialGraph.rootItem.itemId,
                getEnabledFilterKeys(filters),
            );

            renderGraph(currentGraphRef.current);
        });

        void getReferenceGraphLayoutName().then(
            (savedLayoutPresetName) => {
                if (
                    !savedLayoutPresetName ||
                    !(
                        savedLayoutPresetName in
                        REFERENCE_GRAPH.LAYOUT_PRESETS
                    )
                ) {
                    return;
                }

                layoutPresetNameRef.current =
                    savedLayoutPresetName;

                setLayoutPresetName(
                    savedLayoutPresetName,
                );

                runGraphLayout(
                    cy,
                    savedLayoutPresetName,
                );
            },
        );

        return () => {
            hideActiveTooltip();
            cy.destroy();
            cyRef.current = undefined;
        };
    }, [
        containerRef,
        currentFiltersRef,
        currentGraphRef,
        cyRef,
        doc,
        graphHistoryRef,
        harvestForLink,
        initialGraph,
        layoutPresetNameRef,
        loadedFiltersByItemIdRef,
        renderGraph,
        setCurrentFilters,
        setHistoryCount,
        setLayoutPresetName,
    ]);
}