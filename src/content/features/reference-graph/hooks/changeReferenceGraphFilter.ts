import { PROGRESS_STEPS } from "../../../sitecore-harvester/harvest-steps";
import { type SitecoreHarvestFiltersState, isHarvestStep } from "../../../sitecore-harvester/sitecore-harvester.types";
import { buildFoblesUrl } from "../../augmentor/helper";
import { openReferenceGraphProgressModal, closeReferenceGraphProgressModal, initializeReferenceGraphProgressModal } from "../build-progress";
import { createSingleFilterState } from "../graph-filters";
import { refreshGraphVisibilityAndLayout } from "../graph-nodes/graph-expand-collapse";
import type { UseReferenceGraphFilterActionsOptions } from "./use-reference-graph-filter-actions";

export async function changeReferenceGraphFilter(
  key: keyof SitecoreHarvestFiltersState,
  checked: boolean,
  options: UseReferenceGraphFilterActionsOptions,
  setFilters: (filters: SitecoreHarvestFiltersState) => void,
): Promise<void> {
  const { doc, harvestForLink, cyRef, graphState, renderGraph } = options;

  const updatedFilters = {
    ...graphState.currentFiltersRef.current,
    [key]: checked,
  };

  setFilters(updatedFilters);

  const currentHarvestedData =
    graphState.currentPreparedGraphRef.current.harvestedData;

  const loadedFilters =
    graphState.loadedFiltersByItemIdRef.current.get(
      currentHarvestedData.rootItem.scItemId,
    ) ?? new Set<keyof SitecoreHarvestFiltersState>();

  graphState.loadedFiltersByItemIdRef.current.set(
    currentHarvestedData.rootItem.scItemId,
    loadedFilters,
  );

  const alreadyLoaded =
    key === "template" || loadedFilters.has(key);

  if (!checked || alreadyLoaded) {
    const cy = cyRef.current;

    if (cy) {
      refreshGraphVisibilityAndLayout(cy);
    }
  } else {
    const link =
      currentHarvestedData.rootItem.link ??
      buildFoblesUrl(currentHarvestedData.rootItem.scItemId);

    const requestedFilters = createSingleFilterState(key);
    let cancelled = false;

    openReferenceGraphProgressModal(doc, () => {
      cancelled = true;
      closeReferenceGraphProgressModal(doc);
    });

    initializeReferenceGraphProgressModal(
      doc,
      PROGRESS_STEPS.filter(
        (step) =>
          isHarvestStep(step) &&
          step.filterKey === key,
      ),
      requestedFilters,
    );

    const mergedGraph = await harvestForLink(
      link,
      requestedFilters,
      currentHarvestedData,
    );

    const graphChanged =
      graphState.currentPreparedGraphRef.current
        .harvestedData.rootItem.scItemId !==
      currentHarvestedData.rootItem.scItemId;

    if (
      cancelled ||
      !mergedGraph ||
      graphChanged
    ) {
      setFilters({
        ...graphState.currentFiltersRef.current,
        [key]: false,
      });
    } else {
      loadedFilters.add(key);
      await renderGraph(mergedGraph);
    }

    closeReferenceGraphProgressModal(doc);
  }
}