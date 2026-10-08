import { STORAGE } from "../constants/constants-b";
import { getStorageValue, setStorageValue } from "./storage/storage";

export async function getRenderingGraphLayout(): Promise<string | null> {
  const result = await getStorageValue<string>([STORAGE.KEY.RENDERING_GRAPH_LAYOUT]);
  return result[STORAGE.KEY.RENDERING_GRAPH_LAYOUT] ?? null;
}

export async function setRenderingGraphLayout(layout: string): Promise<void> {
  await setStorageValue({ [STORAGE.KEY.RENDERING_GRAPH_LAYOUT]: layout });
}
