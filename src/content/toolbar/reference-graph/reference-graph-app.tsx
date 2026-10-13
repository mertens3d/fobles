import cytoscape from "cytoscape";
import {
    useCallback,
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
import { isHarvestStep } from "../../sitecore-harvester/sitecore-harvester.types";
import { PROGRESS_STEPS } from "../../sitecore-harvester/harvest-steps";
import {
    closeReferenceGraphProgressModal,
    initializeReferenceGraphProgressModal,
    openReferenceGraphProgressModal,
} from "./build-progress";
import { GraphToolbar } from "./components/graph-toolbar";
import { buildElements } from "./graph-elements";
import {
    createAllFiltersState,
    createSingleFilterState,
    getEnabledFilterKeys,
    mergeFilterGraph,
} from "./graph-filters";
import { hideActiveTooltip } from "./graph-tooltip";
import type { LayoutGraphPresetName } from "./graph.types";
import { extensionLog } from "../../logger";
import { CONST } from "../../../constants/const";
import { runGraphLayout } from "./cytoscape/graph-layout";
import { useCytoscape } from "./hooks/use-cytoscape";
import { useReferenceGraph } from "./hooks/use-reference-graph";

type ReferenceGraphAppProps = {
    doc: Document;
    initialGraph: SitecoreHarvestResult;
    harvestForLink: (
        link: string,
        filters: SitecoreHarvestFiltersState,
    ) => Promise<SitecoreHarvestResult | undefined>;
};

export function ReferenceGraphApp({
    doc,
    initialGraph,
    harvestForLink,
}: ReferenceGraphAppProps) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const cyRef = useRef<cytoscape.Core | undefined>(undefined);
    const graphState = useReferenceGraph({ initialGraph, });
    const setFilters = useCallback(
        (filters: SitecoreHarvestFiltersState): void => {
            graphState.currentFiltersRef.current = filters;
            graphState.setCurrentFilters(filters);
            void setReferenceGraphFilters(filters);
        },
        [graphState],
    );

    const renderGraph = useCallback(
        (newGraph: SitecoreHarvestResult): void => {
            const cy = cyRef.current;

            if (!cy) {
                return;
            }

            cy.elements().remove();

            const elements = buildElements(newGraph);

            extensionLog.debug(
                "[Fobles] Reference Graph elements",
                elements,
            );

            cy.add(elements);
            hideActiveTooltip();

            CONST.FOBLES.REFERENCE_GRAPH.FILTER_DEFS.forEach(
                ({ key, className }) => {
                    cy.elements(`.${className}`).style(
                        "display",
                        graphState.currentFiltersRef.current[key]
                            ? "element"
                            : "none",
                    );
                },
            );

            runGraphLayout(cy, graphState.layoutPresetNameRef.current);

            graphState.currentGraphRef.current = newGraph;
            graphState.setCurrentGraph(newGraph);

            if (
                !graphState.loadedFiltersByItemIdRef.current.has(
                    newGraph.rootItem.itemId,
                )
            ) {
                graphState.loadedFiltersByItemIdRef.current.set(
                    newGraph.rootItem.itemId,
                    getEnabledFilterKeys(
                        graphState.currentFiltersRef.current,
                    ),
                );
            }
        },
        [],
    );

    const handleLayoutChange = useCallback(
        (value: LayoutGraphPresetName): void => {
            const cy = cyRef.current;

            graphState.layoutPresetNameRef.current = value;
            graphState.setLayoutPresetName(value);

            if (cy) {
                runGraphLayout(cy, value);
            }

            void setReferenceGraphLayout(value);
        },
        [],
    );

    const handleBack = useCallback((): void => {
        const previousGraph =
            graphState.graphHistoryRef.current.pop();

        graphState.setHistoryCount(
            graphState.graphHistoryRef.current.length,
        );

        if (previousGraph) {
            renderGraph(previousGraph);
        }
    }, [renderGraph]);

    const handleClearFilters = useCallback((): void => {
        const filters = createAllFiltersState(false);

        setFilters(filters);
        renderGraph(graphState.currentGraphRef.current);
    }, [renderGraph, setFilters]);

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

            const currentGraphValue = graphState.currentGraphRef.current;

            const loadedFilters =
                graphState.loadedFiltersByItemIdRef.current.get(
                    currentGraphValue.rootItem.itemId,
                ) ??
                new Set<
                    keyof SitecoreHarvestFiltersState
                >();

            graphState.loadedFiltersByItemIdRef.current.set(
                currentGraphValue.rootItem.itemId,
                loadedFilters,
            );

            if (
                !checked ||
                key === "template" ||
                loadedFilters.has(key)
            ) {
                renderGraph(currentGraphValue);
                return;
            }

            const link =
                currentGraphValue.rootItem.link;

            if (!link) {
                return;
            }

            const requestedFilters =
                createSingleFilterState(key);

            let cancelled = false;

            openReferenceGraphProgressModal(
                doc,
                () => {
                    cancelled = true;
                    closeReferenceGraphProgressModal(doc);
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
            ).then((partialGraph) => {
                closeReferenceGraphProgressModal(doc);

                if (
                    cancelled ||
                    !partialGraph ||
                    graphState.currentGraphRef.current.rootItem
                        .itemId !==
                    currentGraphValue.rootItem.itemId
                ) {
                    const revertedFilters = {
                        ...graphState.currentFiltersRef.current,
                        [key]: false,
                    };

                    setFilters(revertedFilters);
                    return;
                }
                const mergedGraph = mergeFilterGraph(
                    graphState.currentGraphRef.current,
                    partialGraph,
                    key,
                );

                loadedFilters.add(key);
                renderGraph(mergedGraph);
            });
        },
        [doc, harvestForLink, renderGraph],
    );

    useCytoscape({
        doc,
        initialGraph,
        harvestForLink,
        containerRef,
        cyRef,
        currentGraphRef: graphState.currentGraphRef,
        currentFiltersRef: graphState.currentFiltersRef,
        layoutPresetNameRef: graphState.layoutPresetNameRef,
        graphHistoryRef: graphState.graphHistoryRef,
        loadedFiltersByItemIdRef: graphState.loadedFiltersByItemIdRef,
        renderGraph,
        setCurrentFilters: graphState.setCurrentFilters,
        setLayoutPresetName: graphState.setLayoutPresetName,
        setHistoryCount: graphState.setHistoryCount,
    });

    return (
        <>
            <GraphToolbar
                graph={graphState.currentGraph}
                layoutPresetName={graphState.layoutPresetName}
                onLayoutChange={handleLayoutChange}
                canGoBack={graphState.historyCount > 0}
                onBack={handleBack}
                filters={graphState.currentFilters}
                onFilterChange={handleFilterChange}
                onClearFilters={handleClearFilters}
                cy={cyRef.current}
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
}