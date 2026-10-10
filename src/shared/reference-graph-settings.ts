// @source-path [fobles] src/shared/reference-graph-settings.ts

import { STORAGE } from "../constants/constants-b";
import { REFERENCE_GRAPH } from "../constants/graph.const";
import { DEFAULT_RENDERING_GRAPH_FILTERS_STATE } from "../content/toolbar/reference-graph/graph-filters";
import type {  LayoutGraphPresetName, ReferenceGraphFiltersState } from "../content/toolbar/reference-graph/graph.types";
import { getStorageValue, setStorageValue } from "./storage/storage";

export async function getReferenceGraphLayoutName(): Promise<LayoutGraphPresetName > {
  const result = await getStorageValue<LayoutGraphPresetName>([STORAGE.KEY.REFERENCE_GRAPH.LAYOUT]);
  return result[STORAGE.KEY.REFERENCE_GRAPH.LAYOUT] ?? result[REFERENCE_GRAPH.DEFAULT_LAYOUT_PRESET_NAME];
}

export async function setReferenceGraphLayout(layout: LayoutGraphPresetName ): Promise<void> {
  await setStorageValue({ [STORAGE.KEY.REFERENCE_GRAPH.LAYOUT]: layout });
}



export async function getReferenceGraphFilters(): Promise<ReferenceGraphFiltersState> {
  const result = await getStorageValue<Partial<ReferenceGraphFiltersState>>([STORAGE.KEY.REFERENCE_GRAPH.FILTERS]);
  return { ...DEFAULT_RENDERING_GRAPH_FILTERS_STATE, ...result[STORAGE.KEY.REFERENCE_GRAPH.FILTERS] };
}

export async function setReferenceGraphFilters(filters: ReferenceGraphFiltersState): Promise<void> {
  await setStorageValue({ [STORAGE.KEY.REFERENCE_GRAPH.FILTERS]: filters });
}
