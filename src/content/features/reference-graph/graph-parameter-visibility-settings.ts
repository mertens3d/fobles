// @source-path [fobles] src/content/features/reference-graph/graph-parameter-visibility-settings.ts

import {
  getStorageValue,
  setStorageValue,
} from "../../../shared/storage/storage";

const STORAGE_KEY =
  "fobles-reference-graph-parameter-visibility";

export type GraphParameterVisibilitySettings = {
  hideEmptyParameters: boolean;
  hideNonGuidParameters: boolean;
};

export const DEFAULT_GRAPH_PARAMETER_VISIBILITY_SETTINGS:
  GraphParameterVisibilitySettings = {
    hideEmptyParameters: true,
    hideNonGuidParameters: true,
  };

export async function getGraphParameterVisibilitySettings():
  Promise<GraphParameterVisibilitySettings> {
  const result =
    await getStorageValue<unknown>(
      [STORAGE_KEY],
      "local",
    );

  const storedValue =
    result[STORAGE_KEY];

  const settings:
    GraphParameterVisibilitySettings = {
      ...DEFAULT_GRAPH_PARAMETER_VISIBILITY_SETTINGS,
    };

  if (
    storedValue &&
    typeof storedValue === "object"
  ) {
    const storedSettings =
      storedValue as Record<
        string,
        unknown
      >;

    if (
      typeof storedSettings.hideEmptyParameters ===
      "boolean"
    ) {
      settings.hideEmptyParameters =
        storedSettings.hideEmptyParameters;
    }

    if (
      typeof storedSettings.hideNonGuidParameters ===
      "boolean"
    ) {
      settings.hideNonGuidParameters =
        storedSettings.hideNonGuidParameters;
    }
  }

  return settings;
}

export async function setGraphParameterVisibilitySettings(
  settings: GraphParameterVisibilitySettings,
): Promise<void> {
  await setStorageValue(
    {
     [STORAGE_KEY]: settings,
    },
    "local",
  );
}