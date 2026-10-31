// @source-path [fobles] src/content/features/reference-graph/reference-graph-app.tsx
import type cytoscape from "cytoscape";
import { useEffect, useRef } from "react";
import { GRAPH_VIEWPORT } from "../../../constants/graph-viewport.const";
import { extensionLog } from "../../logger";
import { GraphToolbar } from "./components/graph-toolbar";
import { GraphZoomControls } from "./components/graph-zoom-controls";
import { NodeDetailsPanel } from "./components/node-details-panel";
import { ReferenceModelViewer } from "../../shared/ui/reference-model/reference-model-viewer";
import { useCytoscape } from "./hooks/use-cytoscape";
import { useReferenceGraph } from "./hooks/use-reference-graph";
import { useReferenceGraphActions } from "./hooks/use-reference-graph-actions";
import type { ReferenceGraphAppProps } from "./reference-graph-app.types";
import { getFoblesDataSession } from "../../foundation/reference-data/reference-data-service";
import { subscribeRootRefresh } from "./lifecycle/root-refresh-events";

export function ReferenceGraphApp({
  doc,
  workSession,
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
    handleViewReferenceModel,
    handleCloseReferenceModel,
  } = useReferenceGraphActions({ doc, workSession, harvestForLink, cyRef, graphState });

  useCytoscape({
    doc,
    workSession,
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

  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => cyRef.current?.resize());
    observer.observe(container);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const session = getFoblesDataSession(workSession.id);
    return session?.subscribeHarvestProgress(graphState.setHarvestProgress);
  }, [workSession.id, graphState.setHarvestProgress]);

  useEffect(() => {
    const rootItemId = graphState.currentPreparedGraph.harvestedData.rootItem.scItemId;
    return subscribeRootRefresh(rootItemId, (result) => {
      void renderGraph(result);
    });
  }, [graphState.currentPreparedGraph.harvestedData.rootItem.scItemId, renderGraph]);

  const handleZoom = (factor: number, renderedPosition?: cytoscape.Position): void => {
    const cy = cyRef.current;
    if (cy) {
      cy.nodes(".fobles-reference-graph-compound-group").forEach((group) => {
        const parent = group.parent();
        extensionLog.debug("Reference graph: compound group diagnostic", {
          groupId: group.id(),
          parentId: parent.nonempty() ? parent.first().id() : undefined,
          children: group.children().map((child) => ({
            id: child.id(),
            collapseKey: child.data("collapseKey") as unknown,
            compoundGroup: child.data("compoundGroup") as unknown,
          })),
        });
      });
      const level = Math.min(cy.maxZoom(), Math.max(cy.minZoom(), cy.zoom() * factor));
      cy.zoom({
        level,
        renderedPosition: renderedPosition ?? { x: cy.width() / 2, y: cy.height() / 2 },
      });
    }
  };

  const enrichmentStatus =
    graphState.enrichmentProgress === undefined ? "pending" : graphState.enrichmentProgress.status;

  return (
    <div className="fobles-reference-graph-app" data-enrichment-status={enrichmentStatus}>
      {graphState.treeDataVisible && (
        <ReferenceModelViewer
          referenceModel={graphState.currentPreparedGraph.referenceModel}
          onClose={handleCloseReferenceModel}
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
        onViewReferenceModel={handleViewReferenceModel}
      />
      <NodeDetailsPanel
        selectedTreeNodeId={graphState.selectedTreeNodeId}
        nodesById={graphState.currentPreparedGraph.nodesById}
        processingStateByTreeNodeId={graphState.currentPreparedGraph.processingStateByTreeNodeId}
        onClose={() => graphState.setSelectedTreeNodeId(undefined)}
      />
      <div ref={containerRef} className="fobles-reference-graph-canvas" />
      {graphState.graphBusy && (
        <div className="fobles-reference-graph-canvas-blocker" aria-hidden="true" />
      )}
      <GraphZoomControls
        onZoomIn={() => handleZoom(GRAPH_VIEWPORT.ZOOM_FACTOR)}
        onZoomOut={() => handleZoom(1 / GRAPH_VIEWPORT.ZOOM_FACTOR)}
        onFitGraph={() => cyRef.current?.fit(undefined, GRAPH_VIEWPORT.PADDING)}
        onCenterRoot={() => {
          const cy = cyRef.current;
          const rootItem = cy?.getElementById(
            graphState.currentPreparedGraph.harvestedData.rootItem.scItemId,
          );
          if (rootItem?.nonempty()) 
cy?.fit(rootItem, GRAPH_VIEWPORT.PADDING);
        }}
      />
    </div>
  );
}
