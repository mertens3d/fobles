import type { ReferenceGraphViewActions, UseReferenceGraphViewActionsOptions } from "./hooks.types.js";
// @source-path [fobles] src/content/features/reference-graph/hooks/use-reference-graph-view-actions.ts

import { useCallback, useEffect } from "react";
import type { LayoutGraphPresetName } from "../../../../constants/constants.types";
import { setReferenceGraphLayout } from "../../../../shared/reference-graph-settings";
import { getGraphControlsExpanded, setGraphControlsExpanded } from "../graph-controls-settings";
import { refreshGraphVisibilityAndLayout } from "../graph-nodes/graph-expand-collapse";
import { setGraphParameterVisibility } from "../graph-nodes/graph-expand-collapse-view";
import { setGraphParameterVisibilitySettings } from "../graph-parameter-visibility-settings";
import type { GraphParameterVisibilitySettings } from "../reference-graph.types";

export function useReferenceGraphViewActions({
  cyRef,
  graphState,
}: UseReferenceGraphViewActionsOptions): ReferenceGraphViewActions {
  useEffect(() => {
    let disposed = false;

    void getGraphControlsExpanded().then((controlsExpanded) => {
      if (!disposed) {
        graphState.setControlsExpanded(controlsExpanded);
      }
    });

    return () => {
      disposed = true;
    };
  }, [graphState.setControlsExpanded]);

  const handleViewReferenceModel = useCallback((): void => {
    graphState.setReferenceModelVisible(true);
  }, [graphState.setReferenceModelVisible]);

  const handleCloseReferenceModel = useCallback((): void => {
    graphState.setReferenceModelVisible(false);
  }, [graphState.setReferenceModelVisible]);

  const handleRelayout = useCallback((): void => {
    const cy = cyRef.current;

    if (cy) {
      refreshGraphVisibilityAndLayout(cy);
    }
  }, [cyRef]);

  const handleLayoutChange = useCallback(
    (value: LayoutGraphPresetName): void => {
      graphState.layoutPresetNameRef.current = value;
      graphState.setLayoutPresetName(value);

      const cy = cyRef.current;

      if (cy) {
        refreshGraphVisibilityAndLayout(cy);
      }

      void setReferenceGraphLayout(value);
    },
    [cyRef, graphState.layoutPresetNameRef, graphState.setLayoutPresetName],
  );

  const handleControlsExpandedChange = useCallback(
    (controlsExpanded: boolean): void => {
      graphState.setControlsExpanded(controlsExpanded);
      void setGraphControlsExpanded(controlsExpanded);
    },
    [graphState.setControlsExpanded],
  );

  const handleParameterVisibilityChange = useCallback(
    (settings: GraphParameterVisibilitySettings): void => {
      graphState.parameterVisibilitySettingsRef.current = settings;
      graphState.setParameterVisibilitySettings(settings);
      void setGraphParameterVisibilitySettings(settings);

      const cy = cyRef.current;

      if (cy) {
        setGraphParameterVisibility(cy, settings);
        refreshGraphVisibilityAndLayout(cy);
      }
    },
    [cyRef, graphState.parameterVisibilitySettingsRef, graphState.setParameterVisibilitySettings],
  );

  return {
    handleControlsExpandedChange,
    handleParameterVisibilityChange,
    handleLayoutChange,
    handleRelayout,
    handleViewReferenceModel,
    handleCloseReferenceModel,
  };
}
