import { PROGRESS_STEPS } from "../../../sitecore-harvester/harvest-steps";
import { type SitecoreHarvestFiltersState, isHarvestStep } from "../../../sitecore-harvester/sitecore-harvester.types";
import { buildFoblesUrl } from "../../augmentor/helper";
import { openReferenceGraphProgressModal, closeReferenceGraphProgressModal, initializeReferenceGraphProgressModal } from "../build-progress";
import { createSingleFilterState } from "../graph-filters";
import { refreshGraphExpandCollapse } from "../graph-nodes/graph-expand-collapse";
import type { UseReferenceGraphFilterActionsOptions } from "./use-reference-graph-filter-actions";

export async function changeReferenceGraphFilter(
    key: keyof SitecoreHarvestFiltersState,
    checked: boolean,
    options: UseReferenceGraphFilterActionsOptions,
    setFilters: (filters: SitecoreHarvestFiltersState) => void): Promise<void> {
    const { doc, harvestForLink, cyRef, graphState, renderGraph } = options;

    const updatedFilters = {
        ...graphState.currentFiltersRef.current,
        [key]: checked,
    };

    setFilters(updatedFilters);

    const currentGraph = graphState.currentGraphRef.current;

    const loadedFilters = graphState.loadedFiltersByItemIdRef.current.get(
        currentGraph.rootItem.scItemId
    ) ?? new Set<keyof SitecoreHarvestFiltersState>();

    graphState.loadedFiltersByItemIdRef.current.set(
        currentGraph.rootItem.scItemId,
        loadedFilters
    );

    const alreadyLoaded = key === "template" || loadedFilters.has(key);

    if (!checked || alreadyLoaded) {
        const cy = cyRef.current;

        if (cy) {
            refreshGraphExpandCollapse(cy);
        }
    } else {
        const link = currentGraph.rootItem.link ??
            buildFoblesUrl(currentGraph.rootItem.scItemId);

        const requestedFilters = createSingleFilterState(key);

        let cancelled = false;

        openReferenceGraphProgressModal(doc, () => {
            cancelled = true;
            closeReferenceGraphProgressModal(doc);
        });

        initializeReferenceGraphProgressModal(
            doc,
            PROGRESS_STEPS.filter(
                (step) => isHarvestStep(step) && step.filterKey === key
            ),
            requestedFilters
        );

        const mergedGraph = await harvestForLink(
            link,
            requestedFilters,
            currentGraph
        );

        const graphChanged = graphState.currentGraphRef.current.rootItem.scItemId !==
            currentGraph.rootItem.scItemId;

        if (cancelled || !mergedGraph || graphChanged) {
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
