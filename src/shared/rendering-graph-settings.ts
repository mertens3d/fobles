import { STORAGE } from "../constants/constants-b";
import { getStorageValue, setStorageValue } from "./storage/storage";

export async function getRenderingGraphLayout(): Promise<string | null> {
  const result = await getStorageValue<string>([STORAGE.KEY.RENDERING_GRAPH_LAYOUT]);
  return result[STORAGE.KEY.RENDERING_GRAPH_LAYOUT] ?? null;
}

export async function setRenderingGraphLayout(layout: string): Promise<void> {
  await setStorageValue({ [STORAGE.KEY.RENDERING_GRAPH_LAYOUT]: layout });
}

export type RenderingGraphFilters = {
  parent: boolean;
  children: boolean;
  layout: boolean;
  referrers: boolean;
  sections: boolean;
  template: boolean;
};

const DEFAULT_RENDERING_GRAPH_FILTERS: RenderingGraphFilters = {
  parent: true,
  children: true,
  layout: true,
  referrers: true,
  sections: true,
  template: true,
};

export async function getRenderingGraphFilters(): Promise<RenderingGraphFilters> {
  const result = await getStorageValue<Partial<RenderingGraphFilters>>([STORAGE.KEY.RENDERING_GRAPH_FILTERS]);
  return { ...DEFAULT_RENDERING_GRAPH_FILTERS, ...result[STORAGE.KEY.RENDERING_GRAPH_FILTERS] };
}

export async function setRenderingGraphFilters(filters: RenderingGraphFilters): Promise<void> {
  await setStorageValue({ [STORAGE.KEY.RENDERING_GRAPH_FILTERS]: filters });
}
