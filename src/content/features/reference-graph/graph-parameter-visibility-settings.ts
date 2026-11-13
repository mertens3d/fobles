// @source-path [fobles] src/content/features/reference-graph/graph-parameter-visibility-settings.ts

import type { GraphParameterVisibilitySettings } from "./reference-graph.types.js";
import { getStorageValue, setStorageValue } from "../../../shared/storage/storage";
import { DEFAULT_GRAPH_PARAMETER_VISIBILITY_SETTINGS } from "./reference-graph.const.js";
import { STORAGE_KEY } from "./reference-graph.const.js";

export async function getGraphParameterVisibilitySettings(): Promise<GraphParameterVisibilitySettings> {
  const result = await getStorageValue<unknown>([STORAGE_KEY], "local");

  const storedValue = result[STORAGE_KEY];

  const settings: GraphParameterVisibilitySettings = { ...DEFAULT_GRAPH_PARAMETER_VISIBILITY_SETTINGS };

  if (storedValue && typeof storedValue === "object") {
    const storedSettings = storedValue as Record<string, unknown>;

    if (typeof storedSettings.hideEmptyParameters === "boolean") {
      settings.hideEmptyParameters = storedSettings.hideEmptyParameters;
    }

    if (typeof storedSettings.hideNonGuidParameters === "boolean") {
      settings.hideNonGuidParameters = storedSettings.hideNonGuidParameters;
    }
  }

  return settings;
}

export async function setGraphParameterVisibilitySettings(settings: GraphParameterVisibilitySettings): Promise<void> {
  await setStorageValue({ [STORAGE_KEY]: settings }, "local");
}
