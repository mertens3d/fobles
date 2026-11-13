// @source-path [fobles] src/content/features/reference-graph/hooks/use-reference-graph-filter-actions.ts

import { useCallback } from "react";
import type { SitecoreHarvestFiltersState } from "../../../../constants/_base/_base.types";
import { setReferenceGraphFilters } from "../../../../shared/reference-graph-settings";
import { createAllFiltersState } from "../graph-filters";
import { refreshGraphVisibilityAndLayout } from "../graph-nodes/graph-expand-collapse";
import { changeReferenceGraphFilter } from "./changeReferenceGraphFilter";
import type { ReferenceGraphFilterActions, UseReferenceGraphFilterActionsOptions } from "./hooks.types.js";

export function useReferenceGraphFilterActions({
  doc,
  harvestForLink,
  cyRef,
  graphState,
  renderGraph,
}: UseReferenceGraphFilterActionsOptions): ReferenceGraphFilterActions {
  const setFilters = useCallback((filters: SitecoreHarvestFiltersState): void => {
    graphState.currentFiltersRef.current = filters;
    graphState.setCurrentFilters(filters);
    void setReferenceGraphFilters(filters);
  }, []);

  const handleClearFilters = useCallback((): void => {
    const filters = createAllFiltersState(false);
    setFilters(filters);

    const cy = cyRef.current;

    if (cy) {
      refreshGraphVisibilityAndLayout(cy);
    }
  }, [cyRef, setFilters]);

  const handleFilterChange = useCallback(
    (key: keyof SitecoreHarvestFiltersState, checked: boolean): void => {
      void changeReferenceGraphFilter(
        key,
        checked,
        { doc, harvestForLink, cyRef, graphState, renderGraph },
        setFilters,
      );
    },
    [doc, harvestForLink, cyRef, graphState, renderGraph, setFilters],
  );

  return { handleClearFilters, handleFilterChange };
}
