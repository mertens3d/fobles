// @source-path [fobles] src/content/toolbar/reference-graph/components/graph-toolbar.tsx

import type { LayoutGraphPresetName } from "../graph.types";
import type { SitecoreHarvestFiltersState } from "../../../sitecore-harvester/sitecore-harvester.types";
import { BackButton } from "./back-button";
import { GraphTypeSelect } from "./graph-type-select";
import { RootInfo } from "./root-info";
import { GraphFilterList } from "./graph-filter-list";
import { InteractionLegend } from "./interaction-legend";
import type { SitecoreHarvestResult } from "../../../sitecore-harvester/sitecore-harvester.types";
import { GraphViewControls } from "./node-builders/graph-view-controls";

export type GraphToolbarHandle = { showGraph: ( graph: SitecoreHarvestResult, addCurrentGraphToHistory: boolean, ) => void; };

type ToolbarProps = {
  graph: SitecoreHarvestResult;
  layoutPresetName: LayoutGraphPresetName;
  onLayoutChange: (value: LayoutGraphPresetName) => void;
  canGoBack: boolean;
  onBack: () => void;
  filters: SitecoreHarvestFiltersState;
  onFilterChange: (key: keyof SitecoreHarvestFiltersState, checked: boolean) => void;
  cy: cytoscape.Core | undefined
};

export function GraphToolbar({ graph, layoutPresetName, onLayoutChange, canGoBack, onBack, filters, onFilterChange, cy }: ToolbarProps) {
  return (
    <div style={{ position: "absolute", top: 10, left: 10, zIndex: 1, display: "flex", flexDirection: "column", gap: 8, background: "rgba(255,255,255,0.92)", padding: "8px 10px", borderRadius: 6, boxShadow: "0 1px 4px rgba(0,0,0,0.2)", fontFamily: "sans-serif" }}>
      {" "}
      <GraphTypeSelect value={layoutPresetName} onChange={onLayoutChange} />
      <GraphViewControls cy={cy} />
      <BackButton disabled={!canGoBack} onBack={onBack} />
      <GraphFilterList filters={filters} onChange={onFilterChange} />
      <RootInfo graph={graph} />
      <InteractionLegend />
    </div>
  );
}
