// @source-path [fobles] src/content/features/reference-graph/components/graph-toolbar.tsx

import type cytoscape from "cytoscape";
import type {
  SitecoreHarvestFiltersState,
  SitecoreHarvestResult,
} from "../../../sitecore-harvester/sitecore-harvester.types";
import type { LayoutGraphPresetName } from "../graph.types";
import { BackButton } from "./back-button";
import { GraphFilterList } from "./graph-filter-list";
import { GraphTypeSelect } from "./graph-type-select";
import { GraphViewControls } from "./graph-view-controls";
import { InteractionLegend } from "./interaction-legend";
import { RootInfo } from "./root-info";

export type GraphToolbarHandle = {
  showGraph: (
    graph: SitecoreHarvestResult,
    addCurrentGraphToHistory: boolean,
  ) => void;
};

type ToolbarProps = {
  graph: SitecoreHarvestResult;
  layoutPresetName: LayoutGraphPresetName;
  onLayoutChange: (value: LayoutGraphPresetName) => void;
  onRelayout: () => void;
  canGoBack: boolean;
  onBack: () => void;
  filters: SitecoreHarvestFiltersState;
  onFilterChange: (
    key: keyof SitecoreHarvestFiltersState,
    checked: boolean,
  ) => void;
  cy: cytoscape.Core | undefined;
  onClearFilters: () => void;
  controlsExpanded: boolean;
  onControlsExpandedChange: (expanded: boolean) => void;
  buildElapsedSeconds: number | undefined;
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
  cy,
  onClearFilters,
  controlsExpanded,
  onControlsExpandedChange,
  buildElapsedSeconds,
}: ToolbarProps) {
  return (
    <div className="fobles-reference-graph-toolbar">
      <button
        type="button"
        className="fobles-reference-graph-controls-header"
        aria-expanded={controlsExpanded}
        onClick={() => onControlsExpandedChange(!controlsExpanded)}
      >
        Graph Controls
      </button>

      {controlsExpanded && (
        <div className="fobles-reference-graph-controls-content">
          <GraphTypeSelect value={layoutPresetName} onChange={onLayoutChange} />
          <GraphViewControls cy={cy} onRelayout={onRelayout} />
          <BackButton disabled={!canGoBack} onBack={onBack} />
          <GraphFilterList
            filters={filters}
            onChange={onFilterChange}
            onClearFilters={onClearFilters}
          />
          <RootInfo graph={graph} />
          <InteractionLegend />
          <div className="fobles-reference-graph-build-time">
            {buildElapsedSeconds !== undefined
              ? `Built in ${buildElapsedSeconds.toFixed(3)}s`
              : "Building graph"}
          </div>
        </div>
      )}
    </div>
  );
}
