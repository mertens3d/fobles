// @source-path [fobles] src/content/features/reference-graph/hooks/use-reference-graph-filter-actions.ts

import type cytoscape from "cytoscape";
import {
    useCallback,
} from "react";
import {
    setReferenceGraphFilters,
} from "../../../../shared/reference-graph-settings";
import {
    buildFoblesUrl,
} from "../../augmentor/helper";
import {
    PROGRESS_STEPS,
} from "../../../sitecore-harvester/harvest-steps";
import type {
    SitecoreHarvestFiltersState,
    SitecoreHarvestResult,
} from "../../../sitecore-harvester/sitecore-harvester.types";
import {
    isHarvestStep,
} from "../../../sitecore-harvester/sitecore-harvester.types";
import {
    closeReferenceGraphProgressModal,
    initializeReferenceGraphProgressModal,
    openReferenceGraphProgressModal,
} from "../build-progress";
import {
    createAllFiltersState,
    createSingleFilterState,
} from "../graph-filters";
import {
    refreshGraphExpandCollapse,
} from "../graph-nodes/graph-expand-collapse";
import type {
    HarvestForLink,
} from "../graph.types";
import type {
    GraphState,
} from "./use-reference-graph";

type MutableRef<T> = {
    current: T;
};

type UseReferenceGraphFilterActionsOptions = {
    doc: Document;
    harvestForLink: HarvestForLink;
    cyRef: MutableRef<cytoscape.Core | undefined>;
    graphState: GraphState;
    renderGraph: (
        graph: SitecoreHarvestResult,
    ) => Promise<void>;
};

type ReferenceGraphFilterActions = {
    handleClearFilters: () => void;
    handleFilterChange: (
        key: keyof SitecoreHarvestFiltersState,
        checked: boolean,
    ) => void;
};

export function useReferenceGraphFilterActions({
    doc,
    harvestForLink,
    cyRef,
    graphState,
    renderGraph,
}: UseReferenceGraphFilterActionsOptions): ReferenceGraphFilterActions {
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

    const handleClearFilters = useCallback(
        (): void => {
            const filters =
                createAllFiltersState(
                    false,
                );

            setFilters(filters);

            const cy = cyRef.current;

            if (cy) {
                refreshGraphExpandCollapse(
                    cy,
                );
            }
        },
        [setFilters],
    );

    const handleFilterChange = useCallback(
        (
            key:
                keyof SitecoreHarvestFiltersState,
            checked: boolean,
        ): void => {
            const updatedFilters = {
                ...graphState.currentFiltersRef
                    .current,
                [key]: checked,
            };

            setFilters(updatedFilters);

            const currentGraph =
                graphState.currentGraphRef
                    .current;

            const loadedFilters =
                graphState.loadedFiltersByItemIdRef
                    .current
                    .get(
                        currentGraph.rootItem
                            .scItemId,
                    ) ??
                new Set<
                    keyof SitecoreHarvestFiltersState
                >();

            graphState.loadedFiltersByItemIdRef
                .current
                .set(
                    currentGraph.rootItem
                        .scItemId,
                    loadedFilters,
                );

            const alreadyLoaded =
                key === "template" ||
                loadedFilters.has(key);

            if (!checked || alreadyLoaded) {
                const cy = cyRef.current;

                if (cy) {
                    refreshGraphExpandCollapse(
                        cy,
                    );
                }
            } else {
                const link =
                    currentGraph.rootItem.link ??
                    buildFoblesUrl(
                        currentGraph.rootItem
                            .scItemId,
                    );

                const requestedFilters =
                    createSingleFilterState(
                        key,
                    );

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
                    currentGraph,
                ).then(
                    async (
                        mergedGraph,
                    ): Promise<void> => {
                        const graphChanged =
                            graphState
                                .currentGraphRef
                                .current
                                .rootItem
                                .scItemId !==
                            currentGraph
                                .rootItem
                                .scItemId;

                        if (
                            cancelled ||
                            !mergedGraph ||
                            graphChanged
                        ) {
                            setFilters({
                                ...graphState
                                    .currentFiltersRef
                                    .current,
                                [key]: false,
                            });
                        } else {
                            loadedFilters.add(
                                key,
                            );

                            await renderGraph(
                                mergedGraph,
                            );
                        }

                        closeReferenceGraphProgressModal(
                            doc,
                        );
                    },
                );
            }
        },
        [
            doc,
            harvestForLink,
            renderGraph,
            setFilters,
        ],
    );

    return {
        handleClearFilters,
        handleFilterChange,
    };
}