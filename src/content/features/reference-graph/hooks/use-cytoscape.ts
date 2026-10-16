// @source-path [fobles] src/content/features/reference-graph/hooks/use-cytoscape.ts

import type cytoscape from "cytoscape";
import { useEffect } from "react";
import { CONST } from "../../../../constants/const";
import {
  getReferenceGraphFilters,
  getReferenceGraphLayoutName,
} from "../../../../shared/reference-graph-settings";
import { extensionLog } from "../../../logger";
import type {
  SitecoreHarvestFiltersState,
  SitecoreHarvestResult,
} from "../../../sitecore-harvester/sitecore-harvester.types";
import {
  closeReferenceGraphProgressModal,
  handleHarvestProgress,
} from "../build-progress";
import { cytoscapeFactory } from "../cytoscape/cytoscape-config";
import { REFERENCE_GRAPH_STYLE } from "../cytoscape/cytoscape-style";
import { runGraphLayout } from "../cytoscape/graph-layout";
import {
  disposeActiveEnrichmentController,
  startEnrichmentController,
} from "../enrichment/enrichment-controller";
import type { EnrichmentProgress } from "../enrichment/enrichment.types";
import { attachGraphEventHandlers } from "../event-handlers";
import { getEnabledFilterKeys } from "../graph-filters";
import {
  getGraphParameterVisibilitySettings,
  type GraphParameterVisibilitySettings,
} from "../graph-parameter-visibility-settings";
import {
  attachGraphExpandCollapse,
  detachGraphExpandCollapse,
  initializeGraphCollapseState,
  prepareGraphForExpandedLayout,
  refreshGraphExpandCollapse,
} from "../graph-nodes/graph-expand-collapse";
import { setGraphParameterVisibility } from "../graph-nodes/graph-expand-collapse-view";
import type {
  HarvestForLink,
  LayoutGraphPresetName,
} from "../graph.types";
import type { PreparedReferenceGraph } from "../prepared-reference-graph.types";
import { finishReferenceGraphTimer } from "../reference-graph-timing";

type MutableRef<T> = {
  current: T;
};

export type refReturn = {
  containerRef: MutableRef<HTMLDivElement | null>;
};

type UseCytoscapeOptions = {
  doc: Document;
  initialPreparedGraph: PreparedReferenceGraph;
  harvestForLink: HarvestForLink;
  containerRef: MutableRef<HTMLDivElement | null>;
  cyRef: MutableRef<cytoscape.Core | undefined>;
  currentPreparedGraphRef: MutableRef<PreparedReferenceGraph>;
  currentFiltersRef: MutableRef<SitecoreHarvestFiltersState>;
  parameterVisibilitySettingsRef: MutableRef<GraphParameterVisibilitySettings>;
  layoutPresetNameRef: MutableRef<LayoutGraphPresetName>;
  graphHistoryRef: MutableRef<PreparedReferenceGraph[]>;
  loadedFiltersByItemIdRef: MutableRef<
    Map<string, Set<keyof SitecoreHarvestFiltersState>>
  >;
  renderGraph: (
    graph: SitecoreHarvestResult,
  ) => Promise<void>;
  setCurrentFilters: (
    filters: SitecoreHarvestFiltersState,
  ) => void;
  setParameterVisibilitySettings: (
    settings: GraphParameterVisibilitySettings,
  ) => void;
  setLayoutPresetName: (
    name: LayoutGraphPresetName,
  ) => void;
  setHistoryCount: (
    count: number,
  ) => void;
  setBuildElapsedSeconds: (
    elapsedSeconds: number | undefined,
  ) => void;
  setSelectedTreeNodeId: (
    treeNodeId: string | undefined,
  ) => void;
  setEnrichmentProgress: (
    progress: EnrichmentProgress | undefined,
  ) => void;
};

export function useCytoscape({
  doc,
  initialPreparedGraph,
  harvestForLink,
  containerRef,
  cyRef,
  currentPreparedGraphRef,
  currentFiltersRef,
  parameterVisibilitySettingsRef,
  layoutPresetNameRef,
  graphHistoryRef,
  loadedFiltersByItemIdRef,
  renderGraph,
  setCurrentFilters,
  setParameterVisibilitySettings,
  setLayoutPresetName,
  setHistoryCount,
  setBuildElapsedSeconds,
  setSelectedTreeNodeId,
  setEnrichmentProgress,
}: UseCytoscapeOptions): void {
  useEffect(() => {
    const container = containerRef.current;

    let cy: cytoscape.Core | undefined;
    let disposed = false;
    let firstAnimationFrameId: number | undefined;
    let secondAnimationFrameId: number | undefined;

    const initialize = async (): Promise<void> => {
      if (container) {
        handleHarvestProgress(
          doc,
          {
            stepKey: "build-graph",
            label: "Building Graph",
          },
          "active",
        );

        const [
          savedFilters,
          savedLayoutPresetName,
          savedParameterVisibilitySettings,
        ] = await Promise.all([
          getReferenceGraphFilters(),
          getReferenceGraphLayoutName(),
          getGraphParameterVisibilitySettings(),
        ]);

        if (!disposed) {
          const layoutPresetName =
            savedLayoutPresetName &&
            savedLayoutPresetName in CONST.FOBLES.REFERENCE_GRAPH.LAYOUT_PRESETS
              ? savedLayoutPresetName
              : CONST.FOBLES.REFERENCE_GRAPH.DEFAULT_LAYOUT_PRESET_NAME;

          currentFiltersRef.current = savedFilters;
          parameterVisibilitySettingsRef.current =
            savedParameterVisibilitySettings;
          layoutPresetNameRef.current = layoutPresetName;

          setCurrentFilters(savedFilters);
          setParameterVisibilitySettings(
            savedParameterVisibilitySettings,
          );
          setLayoutPresetName(layoutPresetName);

          loadedFiltersByItemIdRef.current.set(
            initialPreparedGraph.harvestedData.rootItem.scItemId,
            getEnabledFilterKeys(savedFilters),
          );

          cy = cytoscapeFactory({
            container,
            elements: initialPreparedGraph.graphElements,
            layout: {
              name: "preset",
            },
            minZoom: 0.2,
            maxZoom: 3,
            style: REFERENCE_GRAPH_STYLE,
          });

          cyRef.current = cy;
          currentPreparedGraphRef.current =
            initialPreparedGraph;

          setGraphParameterVisibility(
            cy,
            savedParameterVisibilitySettings,
          );

          attachGraphEventHandlers(
            cy,
            container,
            harvestForLink,
            doc,
            () => currentFiltersRef.current,
            graphHistoryRef.current,
            () => currentPreparedGraphRef.current,
            renderGraph,
            setHistoryCount,
            setSelectedTreeNodeId,
          );

          await attachGraphExpandCollapse(
            cy,
            container,
            () => currentFiltersRef.current,
            () => layoutPresetNameRef.current,
          );

          refreshGraphExpandCollapse(cy);

          if (!disposed) {
            firstAnimationFrameId = requestAnimationFrame(() => {
              secondAnimationFrameId = requestAnimationFrame(() => {
                if (!disposed && cy) {
                  cy.resize();
                  prepareGraphForExpandedLayout(cy);

                  runGraphLayout(
                    cy,
                    layoutPresetNameRef.current,
                    () => {
                      if (!disposed && cy) {
                        initializeGraphCollapseState(cy);

                        startEnrichmentController({
                          dataTree: initialPreparedGraph.dataTree,
                          nodesById: initialPreparedGraph.nodesById,
                          getCy: () => cyRef.current,
                          onProgress: (progress) => {
                            setEnrichmentProgress(progress);

                            if (
                              !disposed &&
                              progress.status === "complete"
                            ) {
                              const elapsedSeconds =
                                finishReferenceGraphTimer();

                              setBuildElapsedSeconds(
                                elapsedSeconds,
                              );

                              extensionLog.debug(
                                "Reference graph complete",
                                {
                                  nodeCount: cy?.nodes().length,
                                  elapsedSeconds,
                                },
                              );
                            }
                          },
                        });

                        handleHarvestProgress(
                          doc,
                          {
                            stepKey: "build-graph",
                            label: "Building Graph",
                          },
                          "complete",
                        );

                        closeReferenceGraphProgressModal(doc);

                        extensionLog.debug(
                          "Reference graph ready",
                          {
                            nodeCount: cy.nodes().length,
                          },
                        );
                      }
                    },
                  );
                }
              });
            });
          }
        }
      }
    };

    void initialize();

    return () => {
      disposed = true;

      if (firstAnimationFrameId !== undefined) {
        cancelAnimationFrame(firstAnimationFrameId);
      }

      if (secondAnimationFrameId !== undefined) {
        cancelAnimationFrame(secondAnimationFrameId);
      }

      if (cy) {
        detachGraphExpandCollapse(cy);
        cy.destroy();
      }

      disposeActiveEnrichmentController();
      cyRef.current = undefined;
    };
  }, [
    containerRef,
    currentFiltersRef,
    currentPreparedGraphRef,
    cyRef,
    doc,
    graphHistoryRef,
    harvestForLink,
    initialPreparedGraph,
    layoutPresetNameRef,
    loadedFiltersByItemIdRef,
    parameterVisibilitySettingsRef,
    renderGraph,
    setBuildElapsedSeconds,
    setCurrentFilters,
    setEnrichmentProgress,
    setHistoryCount,
    setLayoutPresetName,
    setParameterVisibilitySettings,
    setSelectedTreeNodeId,
  ]);
}