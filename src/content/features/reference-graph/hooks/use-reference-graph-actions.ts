// @source-path [fobles] src/content/features/reference-graph/hooks/use-reference-graph-actions.ts
import type cytoscape from "cytoscape";
import type { WorkSession } from "../../../shell/work-session/work-session.types";
import type { SitecoreHarvestFiltersState, SitecoreHarvestResult } from "../../../sitecore-harvester/sitecore-harvester.types";
import type { GraphParameterVisibilitySettings } from "../graph-parameter-visibility-settings";
import type { HarvestForLink, LayoutGraphPresetName } from "../graph.types";
import type { GraphState } from "./use-reference-graph";
import { useReferenceGraphFilterActions } from "./use-reference-graph-filter-actions";
import { useReferenceGraphRenderActions } from "./use-reference-graph-render-actions";
import { useReferenceGraphViewActions } from "./use-reference-graph-view-actions";
type MutableRef<T> = { current: T };
type UseReferenceGraphActionsOptions = { doc: Document; workSession: WorkSession; harvestForLink: HarvestForLink; cyRef: MutableRef<cytoscape.Core | undefined>; graphState: GraphState; };
type ReferenceGraphActions = { handleBack: () => void; handleClearFilters: () => void; handleControlsExpandedChange: (controlsExpanded: boolean) => void; handleFilterChange: (key: keyof SitecoreHarvestFiltersState, checked: boolean) => void; handleParameterVisibilityChange: (settings: GraphParameterVisibilitySettings) => void; handleLayoutChange: (value: LayoutGraphPresetName) => void; handleRelayout: () => void; renderGraph: (graph: SitecoreHarvestResult) => Promise<void>; handleViewReferenceModel: () => void; handleCloseReferenceModel: () => void; };
export function useReferenceGraphActions({ doc, workSession, harvestForLink, cyRef, graphState }: UseReferenceGraphActionsOptions): ReferenceGraphActions {
  const { handleBack, renderGraph } = useReferenceGraphRenderActions({ doc, workSession, cyRef, graphState });
  const { handleClearFilters, handleFilterChange } = useReferenceGraphFilterActions({ doc, harvestForLink, cyRef, graphState, renderGraph });
  const { handleControlsExpandedChange, handleParameterVisibilityChange, handleLayoutChange, handleRelayout, handleViewReferenceModel, handleCloseReferenceModel } = useReferenceGraphViewActions({ cyRef, graphState });
  return { handleBack, handleClearFilters, handleControlsExpandedChange, handleFilterChange, handleParameterVisibilityChange, handleLayoutChange, handleRelayout, renderGraph, handleViewReferenceModel, handleCloseReferenceModel };
}
