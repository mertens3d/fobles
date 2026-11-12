import type { ReferenceGraphActions, UseReferenceGraphActionsOptions } from "./hooks.types.js";
// @source-path [fobles] src/content/features/reference-graph/hooks/use-reference-graph-actions.ts
import { useReferenceGraphFilterActions } from "./use-reference-graph-filter-actions";
import { useReferenceGraphRenderActions } from "./use-reference-graph-render-actions";
import { useReferenceGraphViewActions } from "./use-reference-graph-view-actions";

export function useReferenceGraphActions({
  doc,
  workSession,
  harvestForLink,
  cyRef,
  graphState,
}: UseReferenceGraphActionsOptions): ReferenceGraphActions {
  const { handleBack, renderGraph } = useReferenceGraphRenderActions({ doc, workSession, cyRef, graphState });
  const { handleClearFilters, handleFilterChange } = useReferenceGraphFilterActions({
    doc,
    harvestForLink,
    cyRef,
    graphState,
    renderGraph,
  });
  const {
    handleControlsExpandedChange,
    handleParameterVisibilityChange,
    handleLayoutChange,
    handleRelayout,
    handleViewReferenceModel,
    handleCloseReferenceModel,
  } = useReferenceGraphViewActions({ cyRef, graphState });
  return {
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
  };
}
