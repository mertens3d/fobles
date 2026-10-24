// @source-path [fobles] src/content/features/reference-graph/hooks/use-reference-graph-render-actions.ts

import type cytoscape from "cytoscape";
import { useCallback } from "react";
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

type UseReferenceGraphRenderActionsOptions = {
  doc: Document;
  cyRef: MutableRef<cytoscape.Core | undefined>;
  graphState: GraphState;
};

export type ReferenceGraphRenderActions = {
  handleBack: () => void;
  renderGraph: (graph: SitecoreHarvestResult) => Promise<void>;
};

export function useReferenceGraphRenderActions({
  doc,
  cyRef,
  graphState,
}: UseReferenceGraphRenderActionsOptions): ReferenceGraphRenderActions {
  const renderPreparedGraph = useCallback(
    (prepared: PreparedReferenceGraph): void => {
      const cy = cyRef.current;
      const rootItemId = prepared.harvestedData.rootItem.scItemId;

      extensionLog.debug("Reference graph render: start", {
        rootItemId,
        nodeCount: prepared.graphElements.length,
        layoutPresetName: graphState.layoutPresetNameRef.current,
      });

      if (cy && !cy.destroyed()) {
        graphState.setGraphBusy(true);
        graphState.setSelectedTreeNodeId(undefined);

        cy.elements().remove();
        cy.add(prepared.graphElements);

        graphState.currentPreparedGraphRef.current = prepared;
        graphState.setCurrentPreparedGraph(prepared);

        if (!graphState.loadedFiltersByItemIdRef.current.has(rootItemId)) {
          graphState.loadedFiltersByItemIdRef.current.set(
            rootItemId,
            getEnabledFilterKeys(graphState.currentFiltersRef.current),
          );
        }

        setGraphParameterVisibility(
          cy,
          graphState.parameterVisibilitySettingsRef.current,
        );

        initializeGraphCollapseState(cy);

        extensionLog.debug("Reference graph render: layout starting", {
          rootItemId,
          layoutPresetName: graphState.layoutPresetNameRef.current,
          nodeCount: cy.nodes().length,
          visibleNodeCount: cy.nodes(":visible").length,
          visibleEdgeCount: cy.edges(":visible").length,
        });

        refreshGraphVisibilityAndLayout(cy, () => {
          extensionLog.debug("Reference graph render: layout complete", {
            rootItemId,
            layoutPresetName: graphState.layoutPresetNameRef.current,
            nodeCount: cy.nodes().length,
            visibleNodeCount: cy.nodes(":visible").length,
            visibleEdgeCount: cy.edges(":visible").length,
          });

          graphState.setGraphBusy(false);

          extensionLog.debug("Reference graph render: blocker removed", {
            rootItemId,
          });

          startEnrichmentController({
            doc,
            dataTree: prepared.dataTree,
            nodesById: prepared.nodesById,
              processingStateByTreeNodeId: prepared.processingStateByTreeNodeId,
            getCy: () => cyRef.current,
            onProgress: graphState.setEnrichmentProgress,
          });
        });
      }
    },
    [
      cyRef,
      graphState.currentFiltersRef,
      graphState.currentPreparedGraphRef,
      graphState.layoutPresetNameRef,
      graphState.loadedFiltersByItemIdRef,
      graphState.parameterVisibilitySettingsRef,
      graphState.setCurrentPreparedGraph,
      graphState.setEnrichmentProgress,
      graphState.setGraphBusy,
      graphState.setSelectedTreeNodeId,
    ],
  );

  const renderGraph = useCallback(
    async (graph: SitecoreHarvestResult): Promise<void> => {
      const rootItemId = graph.rootItem.scItemId;

      graphState.setGraphBusy(true);

      extensionLog.debug("Reference graph prepare: start", {
        rootItemId,
      });

      const prepared = await prepareReferenceGraph(graph, graphState.currentFiltersRef.current, {
        onProgress: (step, status) => {
          handleHarvestProgress(doc, step, status);
        },
      });

      extensionLog.debug("Reference graph prepare: complete", {
        rootItemId,
        prepared: Boolean(prepared),
        nodeCount: prepared?.graphElements.length,
      });

      if (prepared) {
        renderPreparedGraph(prepared);
      } else {
        graphState.setGraphBusy(false);

        extensionLog.warn("Reference graph prepare: no graph produced", {
          rootItemId,
        });
      }
    },
    [
      doc,
      graphState.setGraphBusy,
      renderPreparedGraph,
    ],
  );

  const handleBack = useCallback((): void => {
    const previousPreparedGraph = graphState.graphHistoryRef.current.pop();

    graphState.setHistoryCount(
      graphState.graphHistoryRef.current.length,
    );

    if (previousPreparedGraph) {
      renderPreparedGraph(previousPreparedGraph);
    }
  }, [
    graphState.graphHistoryRef,
    graphState.setHistoryCount,
    renderPreparedGraph,
  ]);

  return {
    handleBack,
    renderGraph,
  };
}