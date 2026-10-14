import cytoscape from "cytoscape";
import { useEffect } from "react";
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
import { buildElements } from "../graph-nodes/graph-elements";
import { getEnabledFilterKeys } from "../graph-filters";
import { hideActiveTooltip } from "../graph-tooltip";
import type { HarvestForLink, LayoutGraphPresetName } from "../graph.types";
import { extensionLog } from "../../../logger";
import { CONST } from "../../../../constants/const";
import { attachGraphExpandCollapse, detachGraphExpandCollapse, initializeGraphCollapseState, prepareGraphForExpandedLayout } from "../graph-nodes/graph-expand-collapse";
import { finishReferenceGraphTimer } from "../reference-graph-timing";

type MutableRef<T> = {
    current: T;
};

export type refReturn = { containerRef: MutableRef<HTMLDivElement | null>; }

type UseCytoscapeOptions = {
    doc: Document;
    initialGraph: SitecoreHarvestResult;
    harvestForLink: HarvestForLink;
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
    setBuildElapsedSeconds: (
        elapsedSeconds: number | undefined,
    ) => void;
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
    setBuildElapsedSeconds,
}: UseCytoscapeOptions): void {
    useEffect(() => {
        const container = containerRef.current;

        let cy: cytoscape.Core | undefined;
        let disposed = false;
        let firstAnimationFrameId: number | undefined;
        let secondAnimationFrameId: number | undefined;

        const initialize = async (): Promise<void> => {
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

            const [
                savedFilters,
                savedLayoutPresetName,
            ] = await Promise.all([
                getReferenceGraphFilters(),
                getReferenceGraphLayoutName(),
            ]);

            if (!disposed) {
                const layoutPresetName =
                    savedLayoutPresetName &&
                        savedLayoutPresetName in
                        CONST.FOBLES.REFERENCE_GRAPH.LAYOUT_PRESETS
                        ? savedLayoutPresetName
                        : CONST.FOBLES.REFERENCE_GRAPH
                            .DEFAULT_LAYOUT_PRESET_NAME;

                currentFiltersRef.current =
                    savedFilters;

                layoutPresetNameRef.current =
                    layoutPresetName;

                setCurrentFilters(
                    savedFilters,
                );

                setLayoutPresetName(
                    layoutPresetName,
                );

                loadedFiltersByItemIdRef.current.set(
                    initialGraph.rootItem.scItemId,
                    getEnabledFilterKeys(
                        savedFilters,
                    ),
                );

                const initialElements =
                    buildElements(initialGraph);

                cy = cytoscape({
                    container,
                    elements: initialElements,
                    layout: {
                        name: "preset",
                    },
                    minZoom: 0.2,
                    maxZoom: 3,
                    style: REFERENCE_GRAPH_STYLE,
                });

                cyRef.current = cy;
                currentGraphRef.current =
                    initialGraph;

                attachGraphEventHandlers(
                    cy,
                    container,
                    harvestForLink,
                    doc,
                    () =>
                        currentFiltersRef.current,
                    graphHistoryRef.current,
                    () =>
                        currentGraphRef.current,
                    renderGraph,
                    setHistoryCount,
                );

                await attachGraphExpandCollapse(
                    cy,
                    container,
                    () =>
                        currentFiltersRef.current,
                    () =>
                        layoutPresetNameRef.current,
                );

                if (!disposed) {
                    firstAnimationFrameId =
                        requestAnimationFrame(() => {
                            secondAnimationFrameId =
                                requestAnimationFrame(() => {
                                    if (
                                        !disposed &&
                                        cy
                                    ) {
                                        cy.resize();

                                        prepareGraphForExpandedLayout(
                                            cy,
                                        );

                                        runGraphLayout(
                                            cy,
                                            layoutPresetNameRef.current,
                                            () => {
                                                if (
                                                    !disposed &&
                                                    cy
                                                ) {
                                                    initializeGraphCollapseState(
                                                        cy,
                                                    );

                                                    const elapsedSeconds =
                                                        finishReferenceGraphTimer();

                                                    setBuildElapsedSeconds(
                                                        elapsedSeconds,
                                                    );

                                                    handleHarvestProgress(
                                                        doc,
                                                        {
                                                            stepKey:
                                                                "build-graph",
                                                            label:
                                                                "Building Graph",
                                                        },
                                                        "complete",
                                                    );

                                                    closeReferenceGraphProgressModal(
                                                        doc,
                                                    );

                                                    extensionLog.debug(
                                                        "Reference graph ready",
                                                        {
                                                            nodeCount:
                                                                cy.nodes()
                                                                    .length,
                                                            elapsedSeconds,
                                                        },
                                                    );
                                                }
                                            },
                                        );
                                    }
                                });
                        });
                }
            }
        };

        void initialize();

        return () => {
            disposed = true;

            if (
                firstAnimationFrameId !==
                undefined
            ) {
                cancelAnimationFrame(
                    firstAnimationFrameId,
                );
            }

            if (
                secondAnimationFrameId !==
                undefined
            ) {
                cancelAnimationFrame(
                    secondAnimationFrameId,
                );
            }

            hideActiveTooltip();

            if (cy) {
                detachGraphExpandCollapse(
                    cy,
                );

                cy.destroy();
            }

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
        setBuildElapsedSeconds,
        setCurrentFilters,
        setHistoryCount,
        setLayoutPresetName,
    ]);
}