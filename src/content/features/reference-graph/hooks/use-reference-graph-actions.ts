// @source-path [fobles] src/content/features/reference-graph/hooks/use-reference-graph-actions.ts

import type cytoscape from "cytoscape";
import {
    useCallback,
    useEffect,
} from "react";
import {
    setReferenceGraphLayout,
} from "../../../../shared/reference-graph-settings";
import type {
    SitecoreHarvestFiltersState,
    SitecoreHarvestResult,
} from "../../../sitecore-harvester/sitecore-harvester.types";
import {
    handleHarvestProgress,
} from "../build-progress";
import {
    runGraphLayout,
} from "../cytoscape/graph-layout";
import {
    getEnabledFilterKeys,
} from "../graph-filters";
import {
    getGraphControlsExpanded,
    setGraphControlsExpanded,
} from "../graph-controls-settings";
import {
    buildElements,
} from "../graph-nodes/graph-elements";
import {
    initializeGraphCollapseState,
    prepareGraphForExpandedLayout,
    refreshGraphExpandCollapse,
} from "../graph-nodes/graph-expand-collapse";
import {
    hideActiveTooltip,
} from "../graph-tooltip";
import type {
    HarvestForLink,
    LayoutGraphPresetName,
} from "../graph.types";
import type {
    GraphState,
} from "./use-reference-graph";
import {
    useReferenceGraphFilterActions,
} from "./use-reference-graph-filter-actions";

type MutableRef<T> = {
    current: T;
};

type UseReferenceGraphActionsOptions = {
    doc: Document;
    harvestForLink: HarvestForLink;
    cyRef: MutableRef<cytoscape.Core | undefined>;
    graphState: GraphState;
};

type ReferenceGraphActions = {
    handleBack: () => void;
    handleClearFilters: () => void;
    handleControlsExpandedChange: (
        controlsExpanded: boolean,
    ) => void;
    handleFilterChange: (
        key: keyof SitecoreHarvestFiltersState,
        checked: boolean,
    ) => void;
    handleLayoutChange: (
        value: LayoutGraphPresetName,
    ) => void;
    handleRelayout: () => void;
    renderGraph: (
        graph: SitecoreHarvestResult,
    ) => Promise<void>;
};

export function useReferenceGraphActions({
    doc,
    harvestForLink,
    cyRef,
    graphState,
}: UseReferenceGraphActionsOptions): ReferenceGraphActions {
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

    const renderGraph = useCallback(
        async (
            graph: SitecoreHarvestResult,
        ): Promise<void> => {
            const cy = cyRef.current;

            if (cy) {
                const elements =
                    await buildElements(
                        graph,
                        {
                            onProgress: (
                                step,
                                status,
                            ) => {
                                handleHarvestProgress(
                                    doc,
                                    step,
                                    status,
                                );
                            },
                        },
                    );

                if (
                    cyRef.current === cy &&
                    !cy.destroyed()
                ) {
                    hideActiveTooltip();

                    cy.elements().remove();
                    cy.add(elements);

                    graphState.currentGraphRef.current =
                        graph;

                    graphState.setCurrentGraph(
                        graph,
                    );

                    if (
                        !graphState.loadedFiltersByItemIdRef
                            .current
                            .has(
                                graph.rootItem
                                    .scItemId,
                            )
                    ) {
                        graphState.loadedFiltersByItemIdRef
                            .current
                            .set(
                                graph.rootItem
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
                        graphState.layoutPresetNameRef
                            .current,
                        () => {
                            initializeGraphCollapseState(
                                cy,
                            );
                        },
                    );
                }
            }
        },
        [doc],
    );

    const handleRelayout = useCallback(
        (): void => {
            const cy = cyRef.current;

            if (cy) {
                prepareGraphForExpandedLayout(
                    cy,
                );

                runGraphLayout(
                    cy,
                    graphState.layoutPresetNameRef
                        .current,
                    () => {
                        refreshGraphExpandCollapse(
                            cy,
                        );
                    },
                );
            }
        },
        [],
    );

    const handleLayoutChange = useCallback(
        (
            value: LayoutGraphPresetName,
        ): void => {
            const cy = cyRef.current;

            graphState.layoutPresetNameRef.current =
                value;

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

    const handleBack = useCallback(
        (): void => {
            const previousGraph =
                graphState.graphHistoryRef
                    .current
                    .pop();

            graphState.setHistoryCount(
                graphState.graphHistoryRef
                    .current
                    .length,
            );

            if (previousGraph) {
                void renderGraph(
                    previousGraph,
                );
            }
        },
        [renderGraph],
    );

    const handleControlsExpandedChange =
        useCallback(
            (
                controlsExpanded: boolean,
            ): void => {
                graphState.setControlsExpanded(
                    controlsExpanded,
                );

                void setGraphControlsExpanded(
                    controlsExpanded,
                );
            },
            [],
        );

    const {
        handleClearFilters,
        handleFilterChange,
    } = useReferenceGraphFilterActions({
        doc,
        harvestForLink,
        cyRef,
        graphState,
        renderGraph,
    });

    return {
        handleBack,
        handleClearFilters,
        handleControlsExpandedChange,
        handleFilterChange,
        handleLayoutChange,
        handleRelayout,
        renderGraph,
    };
}