// @source-path [fobles] src/content/features/reference-graph/reference-graph-app.tsx

import type cytoscape from "cytoscape";
import { GraphToolbar } from "./components/graph-toolbar";
import { GraphZoomControls } from "./components/graph-zoom-controls";
import { NodeDetailsPanel } from "./components/node-details-panel";
import { TreeDataViewer } from "./components/TreeDataViewerProps";
import type { HarvestForLink } from "./graph.types";
import { useCytoscape } from "./hooks/use-cytoscape";
import { useReferenceGraph } from "./hooks/use-reference-graph";
import { useReferenceGraphActions } from "./hooks/use-reference-graph-actions";
import type { PreparedReferenceGraph } from "./prepared-reference-graph.types";
import { useEffect, useRef } from "react";
import { extensionLog } from "../../logger";
import { subscribeHarvestQueueProgress } from "./lifecycle/active-harvest-queue";
import { subscribeRootRefresh } from "./lifecycle/root-refresh-events";
const ZOOM_FACTOR = 1.2;
const VIEWPORT_PADDING = 60;

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
  const graphState = useReferenceGraph({ initialPreparedGraph });

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
    setGraphBusy: graphState.setGraphBusy,
  });

  useEffect(() => subscribeHarvestQueueProgress(graphState.setHarvestProgress), [graphState.setHarvestProgress]);

  // A background root re-harvest (stale cache revision) completes after the graph is already
  // open - this patches the live graph in place via the same renderGraph path a reroot uses.
  useEffect(() => {
    const rootItemId = graphState.currentPreparedGraph.harvestedData.rootItem.scItemId;

    return subscribeRootRefresh(rootItemId, (result) => {
      void renderGraph(result);
    });
  }, [graphState.currentPreparedGraph.harvestedData.rootItem.scItemId, renderGraph]);

  const handleZoom = (
    factor: number,
    renderedPosition?: cytoscape.Position,
  ): void => {
    const cy = cyRef.current;

    if (cy) {
      cy.nodes(".fobles-reference-graph-compound-group").forEach((group) => {
        const parent = group.parent();

        extensionLog.debug("Reference graph: compound group diagnostic", {
          groupId: group.id(),
          parentId: parent.nonempty() ? parent.first().id() : undefined,
          children: group.children().map((child) => ({
            id: child.id(),
            collapseKey: child.data("collapseKey"),
            compoundGroup: child.data("compoundGroup"),
          })),
        });
      });

      const level = Math.min(
        cy.maxZoom(),
        Math.max(cy.minZoom(), cy.zoom() * factor),
      );

      cy.zoom({
        level,
        renderedPosition:
          renderedPosition ?? {
            x: cy.width() / 2,
            y: cy.height() / 2,
          },
      });
    }
  };

  const enrichmentStatus = graphState.enrichmentProgress === undefined ? "pending" : graphState.enrichmentProgress.status;

  return (
    <div
      className="fobles-reference-graph-app"
      data-enrichment-status={enrichmentStatus}
    >
      {graphState.treeDataVisible && (
        <TreeDataViewer
          data={graphState.currentPreparedGraph.dataTree}
          onClose={handleCloseTreeData}
        />
      )}

      <GraphToolbar
        rootItemId={graphState.currentPreparedGraph.harvestedData.rootItem.scItemId}
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
        harvestProgress={graphState.harvestProgress}
        enrichmentProgress={graphState.enrichmentProgress}
        onViewTreeData={handleViewTreeData}
      />

      <NodeDetailsPanel
        selectedTreeNodeId={graphState.selectedTreeNodeId}
        nodesById={graphState.currentPreparedGraph.nodesById}
          processingStateByTreeNodeId={graphState.currentPreparedGraph.processingStateByTreeNodeId}
      />

      <div
        ref={containerRef}
        className="fobles-reference-graph-canvas"
      />

      {graphState.graphBusy && (
        <div
          className="fobles-reference-graph-canvas-blocker"
          aria-hidden="true"
        />
      )}

      <GraphZoomControls
        onZoomIn={() => handleZoom(ZOOM_FACTOR)}
        onZoomOut={() => handleZoom(1 / ZOOM_FACTOR)}
        onFitGraph={() => cyRef.current?.fit(undefined, VIEWPORT_PADDING)}
        onCenterRoot={() => {
          const cy = cyRef.current;
          const rootItem = cy?.getElementById(graphState.currentPreparedGraph.harvestedData.rootItem.scItemId);
          if (rootItem?.nonempty()) cy?.fit(rootItem, VIEWPORT_PADDING);
        }}
      />
    </div>
  );
}