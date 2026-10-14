import cytoscape from "cytoscape";
import {
    useCallback,
    useEffect,
    useRef,
} from "react";
import {
    setReferenceGraphFilters,
    setReferenceGraphLayout,
} from "../../../shared/reference-graph-settings";
import type {
    SitecoreHarvestFiltersState,
    SitecoreHarvestResult,
} from "../../sitecore-harvester/sitecore-harvester.types";
import {
    isHarvestStep,
} from "../../sitecore-harvester/sitecore-harvester.types";
import {
    PROGRESS_STEPS,
} from "../../sitecore-harvester/harvest-steps";
import {
    closeReferenceGraphProgressModal,
    initializeReferenceGraphProgressModal,
    openReferenceGraphProgressModal,
} from "./build-progress";
import {
    GraphToolbar,
} from "./components/graph-toolbar";
import {
    runGraphLayout,
} from "./cytoscape/graph-layout";
import {
    createAllFiltersState,
    createSingleFilterState,
    getEnabledFilterKeys,
} from "./graph-filters";
import {
    getGraphControlsExpanded,
    setGraphControlsExpanded,
} from "./graph-controls-settings";
import {
    buildElements,
} from "./graph-nodes/graph-elements";
import {
    initializeGraphCollapseState,
    prepareGraphForExpandedLayout,
    refreshGraphExpandCollapse,
} from "./graph-nodes/graph-expand-collapse";
import {
    hideActiveTooltip,
} from "./graph-tooltip";
import type {
    HarvestForLink,
    LayoutGraphPresetName,
} from "./graph.types";
import {
    useCytoscape,
} from "./hooks/use-cytoscape";
import {
    useReferenceGraph,
} from "./hooks/use-reference-graph";
import {
    extensionLog,
} from "../../logger";
import { buildFoblesUrl } from "../augmentor/helper";

type ReferenceGraphAppProps = {
    doc: Document;
    initialGraph: SitecoreHarvestResult;
    harvestForLink: HarvestForLink;
};


export function ReferenceGraphApp({
    doc,
    initialGraph,
    harvestForLink,
}: ReferenceGraphAppProps) {


    const handleRelayout = useCallback(
        (): void => {
            const cy = cyRef.current;

            if (cy) {
                prepareGraphForExpandedLayout(cy);

                runGraphLayout(
                    cy,
                    graphState.layoutPresetNameRef.current,
                    () => {
                        refreshGraphExpandCollapse(cy);
                    },
                );
            }
        },
        [],
    );


    const containerRef =
        useRef<HTMLDivElement | null>(
            null,
        );

    const cyRef =
        useRef<
            cytoscape.Core | undefined
        >(undefined);

    const graphState =
        useReferenceGraph({
            initialGraph,
        });

    useEffect(() => {
        let disposed = false;

        void getGraphControlsExpanded()
            .then((controlsExpanded) => {
                if (!disposed) {
                    graphState.setControlsExpanded(
                        controlsExpanded,
                    );
                }
            });

        return () => {
            disposed = true;
        };
    }, []);

    const setFilters = useCallback(
        (
            filters:
                SitecoreHarvestFiltersState,
        ): void => {
            graphState.currentFiltersRef.current =
                filters;

            graphState.setCurrentFilters(
                filters,
            );

            void setReferenceGraphFilters(
                filters,
            );
        },
        [],
    );
    const renderGraph = useCallback(
        (
            sitecoreHarvestResults:
                SitecoreHarvestResult,
        ): void => {
            const cy = cyRef.current;

            if (cy) {
                const elements =
                    buildElements(
                        sitecoreHarvestResults,
                    );

                extensionLog.debug(
                    "[ReferenceGraph renderGraph] rebuilding",
                    {
                        rootItemId:
                            sitecoreHarvestResults
                                .rootItem
                                .scItemId,
                        elementCount:
                            elements.length,
                        nodeCountBefore:
                            cy.nodes().length,
                        edgeCountBefore:
                            cy.edges().length,
                        filters:
                            graphState
                                .currentFiltersRef
                                .current,
                    },
                );

                hideActiveTooltip();

                cy.elements().remove();
                cy.add(elements);

                extensionLog.debug(
                    "[ReferenceGraph renderGraph] elements added",
                    {
                        nodeCountAfter:
                            cy.nodes().length,
                        edgeCountAfter:
                            cy.edges().length,
                    },
                );

                graphState.currentGraphRef.current =
                    sitecoreHarvestResults;

                graphState.setCurrentGraph(
                    sitecoreHarvestResults,
                );

                if (
                    !graphState
                        .loadedFiltersByItemIdRef
                        .current
                        .has(
                            sitecoreHarvestResults
                                .rootItem
                                .scItemId,
                        )
                ) {
                    graphState
                        .loadedFiltersByItemIdRef
                        .current
                        .set(
                            sitecoreHarvestResults
                                .rootItem
                                .scItemId,
                            getEnabledFilterKeys(
                                graphState
                                    .currentFiltersRef
                                    .current,
                            ),
                        );
                }

                prepareGraphForExpandedLayout(
                    cy,
                );

                runGraphLayout(
                    cy,
                    graphState
                        .layoutPresetNameRef
                        .current,
                    () => {
                        initializeGraphCollapseState(
                            cy,
                        );

                        extensionLog.debug(
                            "[ReferenceGraph renderGraph] layout complete",
                            {
                                nodeCount:
                                    cy.nodes()
                                        .length,
                                visibleNodeCount:
                                    cy.nodes(
                                        ":visible",
                                    ).length,
                                edgeCount:
                                    cy.edges()
                                        .length,
                                visibleEdgeCount:
                                    cy.edges(
                                        ":visible",
                                    ).length,
                            },
                        );
                    },
                );
            }
        },
        [],
    );

    const handleLayoutChange =
        useCallback(
            (
                value:
                    LayoutGraphPresetName,
            ): void => {
                const cy =
                    cyRef.current;

                graphState
                    .layoutPresetNameRef
                    .current = value;

                graphState.setLayoutPresetName(
                    value,
                );

                if (cy) {
                    prepareGraphForExpandedLayout(
                        cy,
                    );

                    runGraphLayout(
                        cy,
                        value,
                        () => {
                            refreshGraphExpandCollapse(
                                cy,
                            );
                        },
                    );
                }

                void setReferenceGraphLayout(
                    value,
                );
            },
            [],
        );

    const handleBack =
        useCallback(
            (): void => {
                const previousGraph =
                    graphState
                        .graphHistoryRef
                        .current
                        .pop();

                graphState.setHistoryCount(
                    graphState
                        .graphHistoryRef
                        .current
                        .length,
                );

                if (previousGraph) {
                    renderGraph(
                        previousGraph,
                    );
                }
            },
            [
                renderGraph,
            ],
        );

    const handleClearFilters =
        useCallback(
            (): void => {
                const filters =
                    createAllFiltersState(
                        false,
                    );

                setFilters(filters);

                const cy =
                    cyRef.current;

                if (cy) {
                    refreshGraphExpandCollapse(
                        cy,
                    );
                }
            },
            [
                setFilters,
            ],
        );

    const handleFilterChange = useCallback(
        (
            key: keyof SitecoreHarvestFiltersState,
            checked: boolean,
        ): void => {
            const updatedFilters = {
                ...graphState.currentFiltersRef.current,
                [key]: checked,
            };

            setFilters(updatedFilters);

            const currentGraphValue =
                graphState.currentGraphRef.current;

            const loadedFilters =
                graphState.loadedFiltersByItemIdRef.current.get(
                    currentGraphValue.rootItem.scItemId,
                ) ??
                new Set<
                    keyof SitecoreHarvestFiltersState
                >();

            graphState.loadedFiltersByItemIdRef.current.set(
                currentGraphValue.rootItem.scItemId,
                loadedFilters,
            );

            const alreadyLoaded =
                key === "template" ||
                loadedFilters.has(key);

            if (
                !checked ||
                alreadyLoaded
            ) {
                const cy = cyRef.current;

                if (cy) {
                    refreshGraphExpandCollapse(
                        cy,
                    );
                }
            } else {
                const link =
                    currentGraphValue.rootItem.link ??
                    buildFoblesUrl(
                        currentGraphValue.rootItem.scItemId,
                    );

                const requestedFilters =
                    createSingleFilterState(key);

                let cancelled = false;

                openReferenceGraphProgressModal(
                    doc,
                    () => {
                        cancelled = true;

                        closeReferenceGraphProgressModal(
                            doc,
                        );
                    },
                );

                initializeReferenceGraphProgressModal(
                    doc,
                    PROGRESS_STEPS.filter(
                        (step) =>
                            isHarvestStep(step) &&
                            step.filterKey === key,
                    ),
                    requestedFilters,
                );

                void harvestForLink(
                    link,
                    requestedFilters,
                    currentGraphValue,
                ).then((mergedGraph) => {
                    closeReferenceGraphProgressModal(
                        doc,
                    );

                    const graphChanged =
                        graphState.currentGraphRef.current
                            .rootItem.scItemId !==
                        currentGraphValue.rootItem.scItemId;

                    if (
                        cancelled ||
                        !mergedGraph ||
                        graphChanged
                    ) {
                        const revertedFilters = {
                            ...graphState.currentFiltersRef.current,
                            [key]: false,
                        };

                        setFilters(
                            revertedFilters,
                        );
                    } else {
                        loadedFilters.add(key);

                        renderGraph(
                            mergedGraph,
                        );
                    }
                });
            }
        },
        [
            doc,
            harvestForLink,
            renderGraph,
            setFilters,
        ],
    );

    const handleControlsExpandedChange =
        useCallback(
            (
                controlsExpanded:
                    boolean,
            ): void => {
                graphState
                    .setControlsExpanded(
                        controlsExpanded,
                    );

                void setGraphControlsExpanded(
                    controlsExpanded,
                );
            },
            [],
        );

    useCytoscape({
        doc,
        initialGraph,
        harvestForLink,
        containerRef,
        cyRef,
        currentGraphRef:
            graphState.currentGraphRef,
        currentFiltersRef:
            graphState.currentFiltersRef,
        layoutPresetNameRef:
            graphState.layoutPresetNameRef,
        graphHistoryRef:
            graphState.graphHistoryRef,
        loadedFiltersByItemIdRef:
            graphState
                .loadedFiltersByItemIdRef,
        renderGraph,
        setCurrentFilters:
            graphState
                .setCurrentFilters,
        setLayoutPresetName:
            graphState
                .setLayoutPresetName,
        setHistoryCount:
            graphState
                .setHistoryCount,
        setBuildElapsedSeconds:
            graphState
                .setBuildElapsedSeconds,
    });

    return (
        <>
            return (
            <>
                <GraphToolbar
                    graph={
                        graphState.currentGraph
                    }
                    layoutPresetName={
                        graphState.layoutPresetName
                    }
                    onLayoutChange={
                        handleLayoutChange
                    }
                    onRelayout={
                        handleRelayout
                    }
                    canGoBack={
                        graphState.historyCount > 0
                    }
                    onBack={
                        handleBack
                    }
                    filters={
                        graphState.currentFilters
                    }
                    onFilterChange={
                        handleFilterChange
                    }
                    onClearFilters={
                        handleClearFilters
                    }
                    cy={
                        cyRef.current
                    }
                    controlsExpanded={
                        graphState.controlsExpanded
                    }
                    onControlsExpandedChange={
                        handleControlsExpandedChange
                    }
                    buildElapsedSeconds={
                        graphState.buildElapsedSeconds
                    }
                />

                <div
                    ref={containerRef}
                    style={{
                        width: "100%",
                        height: "100%",
                    }}
                />
            </>
            );
        </>
    );
}