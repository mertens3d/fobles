// @source-path [fobles] src/content/features/reference-graph/hooks/use-reference-graph-render-actions.ts

import type cytoscape from "cytoscape";
import {
  useCallback,
} from "react";
import type {
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
  initializeGraphCollapseState,
  prepareGraphForExpandedLayout,
} from "../graph-nodes/graph-expand-collapse";
import {
  setGraphParameterVisibility,
} from "../graph-nodes/graph-expand-collapse-view";
import {
  startEnrichmentController,
} from "../enrichment/enrichment-controller";
import {
  prepareReferenceGraph,
} from "../prepared-reference-graph";
import type {
  PreparedReferenceGraph,
} from "../prepared-reference-graph.types";
import type {
  GraphState,
} from "./use-reference-graph";

type MutableRef<T> = {
  current: T;
};

type UseReferenceGraphRenderActionsOptions = {
  doc: Document;
  cyRef: MutableRef<
    cytoscape.Core | undefined
  >;
  graphState: GraphState;
};

export type ReferenceGraphRenderActions = {
  handleBack: () => void;
  renderGraph: (
    graph: SitecoreHarvestResult,
  ) => Promise<void>;
};

export function useReferenceGraphRenderActions({
  doc,
  cyRef,
  graphState,
}: UseReferenceGraphRenderActionsOptions):
  ReferenceGraphRenderActions {
  const renderPreparedGraph =
    useCallback(
      (
        prepared:
          PreparedReferenceGraph,
      ): void => {
        const cy = cyRef.current;

        if (
          cy &&
          !cy.destroyed()
        ) {
          graphState.setSelectedTreeNodeId(
            undefined,
          );

          cy.elements().remove();

          cy.add(
            prepared.graphElements,
          );

          graphState.currentPreparedGraphRef.current =
            prepared;

          graphState.setCurrentPreparedGraph(
            prepared,
          );

          if (
            !graphState
              .loadedFiltersByItemIdRef
              .current
              .has(
                prepared
                  .harvestedData
                  .rootItem
                  .scItemId,
              )
          ) {
            graphState
              .loadedFiltersByItemIdRef
              .current
              .set(
                prepared
                  .harvestedData
                  .rootItem
                  .scItemId,
                getEnabledFilterKeys(
                  graphState
                    .currentFiltersRef
                    .current,
                ),
              );
          }

          setGraphParameterVisibility(
            cy,
            graphState
              .parameterVisibilitySettingsRef
              .current,
          );

          prepareGraphForExpandedLayout(
            cy,
          );

          runGraphLayout(
            cy,
            graphState
              .layoutPresetNameRef
              .current,
            () => {
              initializeGraphCollapseState(
                cy,
              );

              startEnrichmentController({
                dataTree: prepared.dataTree,
                nodesById: prepared.nodesById,
                getCy: () => cyRef.current,
                onProgress: graphState.setEnrichmentProgress,
              });
            },
          );
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
        graphState.setSelectedTreeNodeId,
      ],
    );

  const renderGraph =
    useCallback(
      async (
        graph:
          SitecoreHarvestResult,
      ): Promise<void> => {
        const prepared =
          await prepareReferenceGraph(
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

        if (prepared) {
          renderPreparedGraph(
            prepared,
          );
        }
      },
      [
        doc,
        renderPreparedGraph,
      ],
    );

  const handleBack =
    useCallback((): void => {
      const previousPreparedGraph =
        graphState
          .graphHistoryRef
          .current
          .pop();

      graphState.setHistoryCount(
        graphState
          .graphHistoryRef
          .current
          .length,
      );

      if (previousPreparedGraph) {
        renderPreparedGraph(
          previousPreparedGraph,
        );
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