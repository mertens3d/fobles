// @source-path [fobles] src/content/features/reference-graph/hooks/use-reference-graph-view-actions.ts

import type cytoscape from "cytoscape";
import {
  useCallback,
  useEffect,
} from "react";
import {
  setReferenceGraphLayout,
} from "../../../../shared/reference-graph-settings";
import {
  getGraphControlsExpanded,
  setGraphControlsExpanded,
} from "../graph-controls-settings";
import {
  setGraphParameterVisibilitySettings,
  type GraphParameterVisibilitySettings,
} from "../graph-parameter-visibility-settings";
import {
  prepareGraphForExpandedLayout,
  refreshGraphExpandCollapse,
} from "../graph-nodes/graph-expand-collapse";
import {
  setGraphParameterVisibility,
} from "../graph-nodes/graph-expand-collapse-view";
import {
  runGraphLayout,
} from "../cytoscape/graph-layout";
import type {
  LayoutGraphPresetName,
} from "../graph.types";
import type {
  GraphState,
} from "./use-reference-graph";

type MutableRef<T> = {
  current: T;
};

type UseReferenceGraphViewActionsOptions = {
  cyRef: MutableRef<
    cytoscape.Core | undefined
  >;
  graphState: GraphState;
};

export type ReferenceGraphViewActions = {
  handleControlsExpandedChange: (
    controlsExpanded: boolean,
  ) => void;
  handleParameterVisibilityChange: (
    settings: GraphParameterVisibilitySettings,
  ) => void;
  handleLayoutChange: (
    value: LayoutGraphPresetName,
  ) => void;
  handleRelayout: () => void;
  handleViewTreeData: () => void;
  handleCloseTreeData: () => void;
};

export function useReferenceGraphViewActions({
  cyRef,
  graphState,
}: UseReferenceGraphViewActionsOptions):
  ReferenceGraphViewActions {
  useEffect(() => {
    let disposed = false;

    void getGraphControlsExpanded().then(
      (controlsExpanded) => {
        if (!disposed) {
          graphState.setControlsExpanded(
            controlsExpanded,
          );
        }
      },
    );

    return () => {
      disposed = true;
    };
  }, [
    graphState.setControlsExpanded,
  ]);

  const handleViewTreeData =
    useCallback((): void => {
      graphState.setTreeDataVisible(
        true,
      );
    }, [
      graphState.setTreeDataVisible,
    ]);

  const handleCloseTreeData =
    useCallback((): void => {
      graphState.setTreeDataVisible(
        false,
      );
    }, [
      graphState.setTreeDataVisible,
    ]);

  const handleRelayout = useCallback((): void => {
    const cy = cyRef.current;

    if (cy) {
      refreshGraphExpandCollapse(cy);

      runGraphLayout(
        cy,
        graphState.layoutPresetNameRef.current,
        graphState.currentPreparedGraphRef.current.harvestedData.rootItem.scItemId,
        () => {
          refreshGraphExpandCollapse(cy);
        },
      );
    }
  }, [
    cyRef,
    graphState.layoutPresetNameRef,
  ]);

  const handleLayoutChange =
    useCallback(
      (
        value:
          LayoutGraphPresetName,
      ): void => {
        const cy = cyRef.current;

        graphState
          .layoutPresetNameRef
          .current = value;

        graphState.setLayoutPresetName(
          value,
        );

        if (cy) {
          prepareGraphForExpandedLayout(
            cy,
          );

          runGraphLayout(
            cy,
            graphState.layoutPresetNameRef.current,
            graphState.currentPreparedGraphRef.current.harvestedData.rootItem.scItemId,
            () => {
              refreshGraphExpandCollapse(
                cy,
              );
            },
          );
        }

        void setReferenceGraphLayout(
          value,
        );
      },
      [
        cyRef,
        graphState.layoutPresetNameRef,
        graphState.setLayoutPresetName,
      ],
    );

  const handleControlsExpandedChange =
    useCallback(
      (
        controlsExpanded:
          boolean,
      ): void => {
        graphState.setControlsExpanded(
          controlsExpanded,
        );

        void setGraphControlsExpanded(
          controlsExpanded,
        );
      },
      [
        graphState.setControlsExpanded,
      ],
    );

  const handleParameterVisibilityChange =
    useCallback(
      (
        settings:
          GraphParameterVisibilitySettings,
      ): void => {
        graphState
          .parameterVisibilitySettingsRef
          .current = settings;

        graphState.setParameterVisibilitySettings(
          settings,
        );

        void setGraphParameterVisibilitySettings(
          settings,
        );

        const cy = cyRef.current;

        if (cy) {
          setGraphParameterVisibility(
            cy,
            settings,
          );

          refreshGraphExpandCollapse(
            cy,
          );


        }

      },
      [
        cyRef,
        graphState.parameterVisibilitySettingsRef,
        graphState.setParameterVisibilitySettings,
      ],
    );

  return {
    handleControlsExpandedChange,
    handleParameterVisibilityChange,
    handleLayoutChange,
    handleRelayout,
    handleViewTreeData,
    handleCloseTreeData,
  };
}