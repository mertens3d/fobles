// @source-path [fobles] src/content/features/reference-graph/reference-graph-app.tsx

import type cytoscape from "cytoscape";
import { useRef } from "react";
import { EnrichmentProgress } from "./components/enrichment-progress";
import { GraphToolbar } from "./components/graph-toolbar";
import { NodeDetailsPanel } from "./components/node-details-panel";
import { TreeDataViewer } from "./components/TreeDataViewerProps";
import type { HarvestForLink } from "./graph.types";
import { useCytoscape } from "./hooks/use-cytoscape";
import { useReferenceGraph } from "./hooks/use-reference-graph";
import { useReferenceGraphActions } from "./hooks/use-reference-graph-actions";
import type { PreparedReferenceGraph } from "./prepared-reference-graph.types";
import { GraphZoomControls } from "./components/graph-zoom-controls";

const ZOOM_FACTOR = 1.2;

type ReferenceGraphAppProps = {
  doc: Document;
  initialPreparedGraph: PreparedReferenceGraph;
  harvestForLink: HarvestForLink;
};

export function ReferenceGraphApp({
  doc,
  initialPreparedGraph,
  harvestForLink,
}: ReferenceGraphAppProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const cyRef = useRef<cytoscape.Core | undefined>(undefined);

  const graphState = useReferenceGraph({
    initialPreparedGraph,
  });

  const {
    handleBack,
    handleClearFilters,
    handleControlsExpandedChange,
    handleFilterChange,
    handleParameterVisibilityChange,
    handleLayoutChange,
    handleRelayout,
    renderGraph,
    handleViewTreeData,
    handleCloseTreeData,
  } = useReferenceGraphActions({
    doc,
    harvestForLink,
    cyRef,
    graphState,
  });

  useCytoscape({
    doc,
    initialPreparedGraph,
    harvestForLink,
    containerRef,
    cyRef,
    currentPreparedGraphRef: graphState.currentPreparedGraphRef,
    currentFiltersRef: graphState.currentFiltersRef,
    parameterVisibilitySettingsRef: graphState.parameterVisibilitySettingsRef,
    layoutPresetNameRef: graphState.layoutPresetNameRef,
    graphHistoryRef: graphState.graphHistoryRef,
    loadedFiltersByItemIdRef: graphState.loadedFiltersByItemIdRef,
    renderGraph,
    setCurrentFilters: graphState.setCurrentFilters,
    setParameterVisibilitySettings: graphState.setParameterVisibilitySettings,
    setLayoutPresetName: graphState.setLayoutPresetName,
    setHistoryCount: graphState.setHistoryCount,
    setBuildElapsedSeconds: graphState.setBuildElapsedSeconds,
    setSelectedTreeNodeId: graphState.setSelectedTreeNodeId,
    setEnrichmentProgress: graphState.setEnrichmentProgress,
  });

  const handleZoom = (factor: number): void => {
    const cy = cyRef.current;

    if (cy) {
      const level = Math.min(
        cy.maxZoom(),
        Math.max(cy.minZoom(), cy.zoom() * factor),
      );

      cy.zoom({
        level,
        renderedPosition: {
          x: cy.width() / 2,
          y: cy.height() / 2,
        },
      });
    }
  };

  return (
    <>
      {graphState.treeDataVisible && (
        <TreeDataViewer
          data={graphState.currentPreparedGraph.dataTree}
          onClose={handleCloseTreeData}
        />
      )}

      <GraphToolbar
        graph={graphState.currentPreparedGraph.harvestedData}
        layoutPresetName={graphState.layoutPresetName}
        onLayoutChange={handleLayoutChange}
        onRelayout={handleRelayout}
        canGoBack={graphState.historyCount > 0}
        onBack={handleBack}
        filters={graphState.currentFilters}
        onFilterChange={handleFilterChange}
        parameterVisibilitySettings={graphState.parameterVisibilitySettings}
        onParameterVisibilityChange={handleParameterVisibilityChange}
        onClearFilters={handleClearFilters}
        cy={cyRef.current}
        controlsExpanded={graphState.controlsExpanded}
        onControlsExpandedChange={handleControlsExpandedChange}
        buildElapsedSeconds={graphState.buildElapsedSeconds}
        onViewTreeData={handleViewTreeData}
      />

      <EnrichmentProgress progress={graphState.enrichmentProgress} />

      <NodeDetailsPanel
        selectedTreeNodeId={graphState.selectedTreeNodeId}
        nodesById={graphState.currentPreparedGraph.nodesById}
      />

      <div
        ref={containerRef}
        style={{
          width: "100%",
          height: "100%",
        }}
      />

      <GraphZoomControls
        onZoomIn={() => handleZoom(ZOOM_FACTOR)}
        onZoomOut={() => handleZoom(1 / ZOOM_FACTOR)}
      />
    </>
  );
}