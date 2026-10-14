// @source-path [fobles] src/content/toolbar/reference-graph/components/graph-toolbar.tsx

import type { LayoutGraphPresetName } from "../graph.types";
import type { SitecoreHarvestFiltersState } from "../../../sitecore-harvester/sitecore-harvester.types";
import { BackButton } from "./back-button";
import { GraphTypeSelect } from "./graph-type-select";
import { RootInfo } from "./root-info";
import { GraphFilterList } from "./graph-filter-list";
import { InteractionLegend } from "./interaction-legend";
import type { SitecoreHarvestResult } from "../../../sitecore-harvester/sitecore-harvester.types";
import { GraphViewControls } from "./graph-view-controls";

export type GraphToolbarHandle = { showGraph: ( graph: SitecoreHarvestResult, addCurrentGraphToHistory: boolean, ) => void; };

type ToolbarProps = {
  graph: SitecoreHarvestResult;
  layoutPresetName: LayoutGraphPresetName;
  onLayoutChange: (value: LayoutGraphPresetName) => void;
  canGoBack: boolean;
  onBack: () => void;
  filters: SitecoreHarvestFiltersState;
  onFilterChange: (key: keyof SitecoreHarvestFiltersState, checked: boolean) => void;
  cy: cytoscape.Core | undefined;
  onClearFilters: () => void;
};

export function GraphToolbar({ graph, layoutPresetName, onLayoutChange, canGoBack, onBack, filters, onFilterChange, cy, onClearFilters }: ToolbarProps) {
  return (
    <div className="fobles-reference-graph-toolbar">
      {" "}
      <GraphTypeSelect value={layoutPresetName} onChange={onLayoutChange} />
      <GraphViewControls cy={cy} />
      <BackButton disabled={!canGoBack} onBack={onBack} />
      <GraphFilterList filters={filters} onChange={onFilterChange} onClearFilters={onClearFilters} />
      <RootInfo graph={graph} />
      <InteractionLegend />
    </div>
  );
}
