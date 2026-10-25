// @source-path [fobles] src/content/features/reference-graph/hooks/use-reference-graph-filter-actions.ts

import type cytoscape from "cytoscape";
import { useCallback } from "react";
import { setReferenceGraphFilters } from "../../../../shared/reference-graph-settings";
import type {
  SitecoreHarvestFiltersState,
  SitecoreHarvestResult,
} from "../../../foundation/harvesting/sitecore-harvester.types";
import { createAllFiltersState } from "../graph-filters";
import { refreshGraphVisibilityAndLayout } from "../graph-nodes/graph-expand-collapse";
import type { HarvestForLink } from "../graph.types";
import { changeReferenceGraphFilter } from "./changeReferenceGraphFilter";
import type { GraphState } from "./use-reference-graph";

type MutableRef<T> = { current: T };

export type UseReferenceGraphFilterActionsOptions = {
  doc: Document;
  harvestForLink: HarvestForLink;
  cyRef: MutableRef<cytoscape.Core | undefined>;
  graphState: GraphState;
  renderGraph: (graph: SitecoreHarvestResult) => Promise<void>;
};

type ReferenceGraphFilterActions = {
  handleClearFilters: () => void;
  handleFilterChange: (
    key: keyof SitecoreHarvestFiltersState,
    checked: boolean,
  ) => void;
};

export function useReferenceGraphFilterActions({
  doc,
  harvestForLink,
  cyRef,
  graphState,
  renderGraph,
}: UseReferenceGraphFilterActionsOptions): ReferenceGraphFilterActions {
  const setFilters = useCallback(
    (filters: SitecoreHarvestFiltersState): void => {
      graphState.currentFiltersRef.current = filters;
      graphState.setCurrentFilters(filters);
      void setReferenceGraphFilters(filters);
    },
    [],
  );

  const handleClearFilters = useCallback((): void => {
    const filters = createAllFiltersState(false);
    setFilters(filters);

    const cy = cyRef.current;

    if (cy) {
      refreshGraphVisibilityAndLayout(cy);
    }
  }, [cyRef, setFilters]);

  const handleFilterChange = useCallback(
    (
      key: keyof SitecoreHarvestFiltersState,
      checked: boolean,
    ): void => {
      void changeReferenceGraphFilter(
        key,
        checked,
        {
          doc,
          harvestForLink,
          cyRef,
          graphState,
          renderGraph,
        },
        setFilters,
      );
    },
    [
      doc,
      harvestForLink,
      cyRef,
      graphState,
      renderGraph,
      setFilters,
    ],
  );

  return {
    handleClearFilters,
    handleFilterChange,
  };
}