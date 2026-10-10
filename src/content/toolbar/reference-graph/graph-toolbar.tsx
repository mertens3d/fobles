import type { LayoutGraphPresetName, ReferenceGraphFiltersState } from "./graph.types";
import type { ReferenceGraphResult } from "./reference-graph.types";
import { BackButton } from "./back-button";
import { GraphTypeSelect } from "./graph-type-select";
import { RootInfo } from "./root-info";
import { GraphFilterList } from "./graph-filter-list";
import { InteractionLegend } from "./interaction-legend";

type ToolbarProps = {
  graph: ReferenceGraphResult;
  layoutPresetName: LayoutGraphPresetName;
  onLayoutChange: (value: LayoutGraphPresetName) => void;
  canGoBack: boolean;
  onBack: () => void;
  filters: ReferenceGraphFiltersState;
  onFilterChange: (key: keyof ReferenceGraphFiltersState, checked: boolean) => void;
};

export function GraphToolbar({ graph, layoutPresetName, onLayoutChange, canGoBack, onBack, filters, onFilterChange }: ToolbarProps) {
  <RootInfo graph={graph} />;

  return (
    <div style={{ position: "absolute", top: 10, left: 10, zIndex: 1, display: "flex", flexDirection: "column", gap: 8, background: "rgba(255,255,255,0.92)", padding: "8px 10px", borderRadius: 6, boxShadow: "0 1px 4px rgba(0,0,0,0.2)", fontFamily: "sans-serif" }}>
      {" "}
      <GraphTypeSelect value={layoutPresetName} onChange={onLayoutChange} />
      <BackButton disabled={!canGoBack} onBack={onBack} />
      <GraphFilterList filters={filters} onChange={onFilterChange} />
      <RootInfo graph={graph} />
      <InteractionLegend />
    </div>
  );
}
