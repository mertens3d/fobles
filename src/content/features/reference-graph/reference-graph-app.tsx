// @source-path [fobles] src/content/features/reference-graph/reference-graph-app.tsx

import type cytoscape from "cytoscape";
import {
    useRef,
} from "react";
import type {
    SitecoreHarvestResult,
} from "../../sitecore-harvester/sitecore-harvester.types";
import {
    GraphToolbar,
} from "./components/graph-toolbar";
import type {
    HarvestForLink,
} from "./graph.types";
import {
    useCytoscape,
} from "./hooks/use-cytoscape";
import {
    useReferenceGraph,
} from "./hooks/use-reference-graph";
import {
    useReferenceGraphActions,
} from "./hooks/use-reference-graph-actions";

type ReferenceGraphAppProps = {
    doc: Document;
    initialGraph: SitecoreHarvestResult;
    initialElements:
        cytoscape.ElementDefinition[];
    harvestForLink: HarvestForLink;
};

export function ReferenceGraphApp({
    doc,
    initialGraph,
    initialElements,
    harvestForLink,
}: ReferenceGraphAppProps) {
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

    const {
        handleBack,
        handleClearFilters,
        handleControlsExpandedChange,
        handleFilterChange,
        handleLayoutChange,
        handleRelayout,
        renderGraph,
    } = useReferenceGraphActions({
        doc,
        harvestForLink,
        cyRef,
        graphState,
    });

    useCytoscape({
        doc,
        initialGraph,
        initialElements,
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
            graphState.setCurrentFilters,
        setLayoutPresetName:
            graphState.setLayoutPresetName,
        setHistoryCount:
            graphState.setHistoryCount,
        setBuildElapsedSeconds:
            graphState
                .setBuildElapsedSeconds,
    });

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
                    graphState
                        .buildElapsedSeconds
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
}