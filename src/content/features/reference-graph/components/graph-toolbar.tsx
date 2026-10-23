// @source-path [fobles] src/content/features/reference-graph/components/graph-toolbar.tsx

import type cytoscape from "cytoscape";
import type {
  SitecoreHarvestFiltersState,
  SitecoreHarvestResult,
} from "../../../sitecore-harvester/sitecore-harvester.types";
import type { EnrichmentProgress as EnrichmentProgressData } from "../enrichment/enrichment.types";
import type { GraphParameterVisibilitySettings } from "../graph-parameter-visibility-settings";
import type { LayoutGraphPresetName } from "../graph.types";
import { BackButton } from "./back-button";
import { BuildTime } from "./BuildTime";
import { EnrichmentProgress } from "./enrichment-progress";
import { GraphFilterList } from "./graph-filter-list";
import { GraphToolBarHeaderButton } from "./graph-toolbar-header-button";
import { GraphTypeSelect } from "./graph-type-select";
import { GraphViewControls } from "./graph-view-controls";
import { ParameterVisibilityControls } from "./parameter-visibility-controls";
import { ViewTreeDataButton } from "./view-tree-data-button";
import { GraphHelpDialog, useGraphHelpDialog } from "./graph-help-dialog";

export type GraphToolbarHandle = {
  showGraph: (
    graph: SitecoreHarvestResult,
    addCurrentGraphToHistory: boolean,
  ) => void;
};

type ToolbarProps = {
  rootItemId: string;
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
  parameterVisibilitySettings: GraphParameterVisibilitySettings;
  onParameterVisibilityChange: (
    settings: GraphParameterVisibilitySettings,
  ) => void;
  cy: cytoscape.Core | undefined;
  onClearFilters: () => void;
  controlsExpanded: boolean;
  onControlsExpandedChange: (expanded: boolean) => void;
  buildElapsedSeconds: number | undefined;
  enrichmentProgress: EnrichmentProgressData | undefined;
  onViewTreeData: () => void;
};

export function GraphToolbar({
  rootItemId,
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
  enrichmentProgress,
  onViewTreeData,
}: ToolbarProps) {
  const { dialogRef, showGraphHelp } = useGraphHelpDialog();
  return (
    <div className="fobles-reference-graph-toolbar">
      <GraphToolBarHeaderButton
        controlsExpanded={controlsExpanded}
        onControlsExpandedChange={onControlsExpandedChange}
        onHelp={showGraphHelp}
      />

      {controlsExpanded && (
        <div className="fobles-reference-graph-controls-content">
          <GraphTypeSelect
            value={layoutPresetName}
            onChange={onLayoutChange}
          />

          <GraphViewControls
            cy={cy}
            rootItemId={rootItemId}
            onRelayout={onRelayout}
          />

          <BackButton
            disabled={!canGoBack}
            onBack={onBack}
          />

          <GraphFilterList
            filters={filters}
            onChange={onFilterChange}
            onClearFilters={onClearFilters}
          />

          <ParameterVisibilityControls
            settings={parameterVisibilitySettings}
            onChange={onParameterVisibilityChange}
          />


          <ViewTreeDataButton
            onViewTreeData={onViewTreeData}
          />
        </div>
      )}

      <GraphHelpDialog dialogRef={dialogRef} />
      <div className="fobles-reference-graph-toolbar-footer">
        <EnrichmentProgress
          progress={enrichmentProgress}
        />

        <BuildTime
          buildElapsedSeconds={buildElapsedSeconds}
        />
      </div>
    </div>
  );
}