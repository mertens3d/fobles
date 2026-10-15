// @source-path [fobles] src/content/features/reference-graph/components/graph-toolbar.tsx

import type cytoscape from "cytoscape";
import type {
  SitecoreHarvestFiltersState,
  SitecoreHarvestResult,
} from "../../../sitecore-harvester/sitecore-harvester.types";
import type {
  GraphParameterVisibilitySettings,
} from "../graph-parameter-visibility-settings";
import type {
  LayoutGraphPresetName,
} from "../graph.types";
import { BackButton } from "./back-button";
import { BuildTime } from "./BuildTime";
import { GraphFilterList } from "./graph-filter-list";
import { GraphToolBarHeaderButton } from "./graph-toolbar-header-button";
import { GraphTypeSelect } from "./graph-type-select";
import { GraphViewControls } from "./graph-view-controls";
import { InteractionLegend } from "./interaction-legend";
import { RootInfo } from "./root-info";
import { ViewTreeDataButton } from "./view-tree-data-button";
import { ParameterVisibilityControls } from "./parameter-visibility-controls";

export type GraphToolbarHandle = {
  showGraph: (
    graph: SitecoreHarvestResult,
    addCurrentGraphToHistory: boolean,
  ) => void;
};

type ToolbarProps = {
  graph: SitecoreHarvestResult;
  layoutPresetName: LayoutGraphPresetName;
  onLayoutChange: (
    value: LayoutGraphPresetName,
  ) => void;
  onRelayout: () => void;
  canGoBack: boolean;
  onBack: () => void;
  filters: SitecoreHarvestFiltersState;
  onFilterChange: (
    key: keyof SitecoreHarvestFiltersState,
    checked: boolean,
  ) => void;
  parameterVisibilitySettings:
    GraphParameterVisibilitySettings;
  onParameterVisibilityChange: (
    settings: GraphParameterVisibilitySettings,
  ) => void;
  cy: cytoscape.Core | undefined;
  onClearFilters: () => void;
  controlsExpanded: boolean;
  onControlsExpandedChange: (
    expanded: boolean,
  ) => void;
  buildElapsedSeconds:
    number | undefined;
  onViewTreeData: () => void;
};

export function GraphToolbar({
  graph,
  layoutPresetName,
  onLayoutChange,
  onRelayout,
  canGoBack,
  onBack,
  filters,
  onFilterChange,
  parameterVisibilitySettings,
  onParameterVisibilityChange,
  cy,
  onClearFilters,
  controlsExpanded,
  onControlsExpandedChange,
  buildElapsedSeconds,
  onViewTreeData,
}: ToolbarProps) {
  return (
    <div className="fobles-reference-graph-toolbar">
      <GraphToolBarHeaderButton
        controlsExpanded={controlsExpanded}
        onControlsExpandedChange={
          onControlsExpandedChange
        }
      />

      {controlsExpanded && (
        <div className="fobles-reference-graph-controls-content">
          <GraphTypeSelect
            value={layoutPresetName}
            onChange={onLayoutChange}
          />

          <GraphViewControls
            cy={cy}
            onRelayout={onRelayout}
          />

          <BackButton
            disabled={!canGoBack}
            onBack={onBack}
          />

          <GraphFilterList
            filters={filters}
            onChange={onFilterChange}
            onClearFilters={
              onClearFilters
            }
          />

          <ParameterVisibilityControls
            settings={
              parameterVisibilitySettings
            }
            onChange={
              onParameterVisibilityChange
            }
          />

          <RootInfo graph={graph} />

          <InteractionLegend />

          <ViewTreeDataButton
            onViewTreeData={
              onViewTreeData
            }
          />

          <BuildTime
            buildElapsedSeconds={
              buildElapsedSeconds
            }
          />
        </div>
      )}
    </div>
  );
}