// @source-path [fobles] src/content/features/reference-graph/hooks/use-reference-graph-render-actions.ts
import type cytoscape from "cytoscape";
import { useCallback } from "react";
import type { WorkSession } from "../../../shell/work-session/work-session.types";
import { extensionLog } from "../../../logger";
import type { SitecoreHarvestResult } from "../../../sitecore-harvester/sitecore-harvester.types";
import { handleHarvestProgress } from "../build-progress";
import { startEnrichmentController } from "../enrichment/enrichment-controller";
import { getEnabledFilterKeys } from "../graph-filters";
import { initializeGraphCollapseState, refreshGraphVisibilityAndLayout } from "../graph-nodes/graph-expand-collapse";
import { setGraphParameterVisibility } from "../graph-nodes/graph-expand-collapse-view";
import { prepareReferenceGraph } from "../prepared-reference-graph";
import type { PreparedReferenceGraph } from "../prepared-reference-graph.types";
import type { GraphState } from "./use-reference-graph";
type MutableRef<T> = { current: T };
type UseReferenceGraphRenderActionsOptions = { doc: Document; workSession: WorkSession; cyRef: MutableRef<cytoscape.Core | undefined>; graphState: GraphState; };
export type ReferenceGraphRenderActions = { handleBack: () => void; renderGraph: (graph: SitecoreHarvestResult) => Promise<void>; };
export function useReferenceGraphRenderActions({ doc, workSession, cyRef, graphState }: UseReferenceGraphRenderActionsOptions): ReferenceGraphRenderActions {
  const renderPreparedGraph = useCallback((prepared: PreparedReferenceGraph): void => {
    const cy = cyRef.current; const rootItemId = prepared.harvestedData.rootItem.scItemId;
    if (cy && !cy.destroyed()) {
      graphState.setGraphBusy(true); graphState.setSelectedTreeNodeId(undefined); cy.elements().remove(); cy.add(prepared.graphElements); graphState.currentPreparedGraphRef.current = prepared; graphState.setCurrentPreparedGraph(prepared);
      if (!graphState.loadedFiltersByItemIdRef.current.has(rootItemId)) graphState.loadedFiltersByItemIdRef.current.set(rootItemId, getEnabledFilterKeys(graphState.currentFiltersRef.current));
      setGraphParameterVisibility(cy, graphState.parameterVisibilitySettingsRef.current); initializeGraphCollapseState(cy);
      refreshGraphVisibilityAndLayout(cy, () => { graphState.setGraphBusy(false); startEnrichmentController({ doc, workSession, referenceModel: prepared.referenceModel, nodesById: prepared.nodesById, processingStateByTreeNodeId: prepared.processingStateByTreeNodeId, getCy: () => cyRef.current, onProgress: graphState.setEnrichmentProgress }); });
    }
  }, [cyRef, doc, graphState.currentFiltersRef, graphState.currentPreparedGraphRef, graphState.loadedFiltersByItemIdRef, graphState.parameterVisibilitySettingsRef, graphState.setCurrentPreparedGraph, graphState.setEnrichmentProgress, graphState.setGraphBusy, graphState.setSelectedTreeNodeId, workSession]);
  const renderGraph = useCallback(async (graph: SitecoreHarvestResult): Promise<void> => { graphState.setGraphBusy(true); const prepared = await prepareReferenceGraph(graph, graphState.currentFiltersRef.current, { onProgress: (step, status) => handleHarvestProgress(doc, step, status) }); if (prepared) renderPreparedGraph(prepared); else { graphState.setGraphBusy(false); extensionLog.warn("Reference graph prepare: no graph produced", { rootItemId: graph.rootItem.scItemId }); } }, [doc, graphState.currentFiltersRef, graphState.setGraphBusy, renderPreparedGraph]);
  const handleBack = useCallback((): void => { const previousPreparedGraph = graphState.graphHistoryRef.current.pop(); graphState.setHistoryCount(graphState.graphHistoryRef.current.length); if (previousPreparedGraph) renderPreparedGraph(previousPreparedGraph); }, [graphState.graphHistoryRef, graphState.setHistoryCount, renderPreparedGraph]);
  return { handleBack, renderGraph };
}
