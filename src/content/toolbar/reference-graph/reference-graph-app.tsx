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
import { buildElements } from "./graph-nodes/graph-elements";
import {
    createAllFiltersState,
    createSingleFilterState,
    getEnabledFilterKeys,
} from "./graph-filters";
import { hideActiveTooltip } from "./graph-tooltip";
import type { HarvestForLink, LayoutGraphPresetName } from "./graph.types";
import { extensionLog } from "../../logger";
import { CONST } from "../../../constants/const";
import { runGraphLayout } from "./cytoscape/graph-layout";
import { useCytoscape } from "./hooks/use-cytoscape";
import { useReferenceGraph } from "./hooks/use-reference-graph";

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
        (sitecoreHarvestResults: SitecoreHarvestResult): void => {
            const cy = cyRef.current;

            if (!cy) {
                return;
            }

            cy.elements().remove();

            //extensionLog.debug("[Fobles] sitecoreHarvestResults: ", sitecoreHarvestResults);
            const elements = buildElements(sitecoreHarvestResults);

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

            graphState.currentGraphRef.current = sitecoreHarvestResults;
            graphState.setCurrentGraph(sitecoreHarvestResults);

            if (
                !graphState.loadedFiltersByItemIdRef.current.has(
                    sitecoreHarvestResults.rootItem.scItemId,
                )
            ) {
                graphState.loadedFiltersByItemIdRef.current.set(
                    sitecoreHarvestResults.rootItem.scItemId,
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
                    currentGraphValue.rootItem.scItemId,
                ) ??
                new Set<
                    keyof SitecoreHarvestFiltersState
                >();

            graphState.loadedFiltersByItemIdRef.current.set(
                currentGraphValue.rootItem.scItemId,
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
                currentGraphValue,
            ).then((mergedGraph) => {
                closeReferenceGraphProgressModal(doc);

                if (
                    cancelled ||
                    !mergedGraph ||
                    graphState.currentGraphRef.current.rootItem
                        .scItemId !==
                    currentGraphValue.rootItem.scItemId
                ) {
                    const revertedFilters = {
                        ...graphState.currentFiltersRef.current,
                        [key]: false,
                    };

                    setFilters(revertedFilters);
                    return;
                }

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