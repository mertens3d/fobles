// @source-path [fobles] src/content/features/reference-graph/components/graph-toolbar.tsx
import type cytoscape from "cytoscape";
import type {
  SitecoreHarvestFiltersState,
  SitecoreHarvestResult,
} from "../../../foundation/harvesting/sitecore-harvester.types";
import type { EnrichmentProgress as EnrichmentProgressData } from "../enrichment/enrichment.types";
import type { GraphParameterVisibilitySettings } from "../graph-parameter-visibility-settings";
import type { LayoutGraphPresetName } from "../graph.types";
import type { PhaseProgress } from "../../../shared/ui/reference-controls/lifecycle.types";
import { BackButton } from "./back-button";
import { ControlsHeader } from "../../../shared/ui/reference-controls/controls-header";
import { LifecycleProgressFooter } from "../../../shared/ui/reference-controls/lifecycle-progress-footer";
import { GraphFilterList } from "../../../shared/ui/reference-controls/graph-filter-list";
import { GraphTypeSelect } from "./graph-type-select";
import { GraphViewControls } from "./graph-view-controls";
import { ParameterVisibilityControls } from "./parameter-visibility-controls";
import { ViewReferenceModelButton } from "../../../shared/ui/reference-controls/view-reference-model-button";
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
  harvestProgress: PhaseProgress | undefined;
  enrichmentProgress: EnrichmentProgressData | undefined;
  onViewReferenceModel: () => void;
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
  harvestProgress,
  enrichmentProgress,
  onViewReferenceModel,
}: ToolbarProps) {
  const { dialogRef, showGraphHelp } = useGraphHelpDialog();
  const resolveProgress: PhaseProgress | undefined = enrichmentProgress && {
    completed: enrichmentProgress.completedItemCount,
    max: enrichmentProgress.maxItemCount,
    status: enrichmentProgress.status,
  };
  return (
    <div className="fobles-reference-graph-toolbar">
      <ControlsHeader
        title="Graph Controls"
        expanded={controlsExpanded}
        onExpandedChange={onControlsExpandedChange}
        onHelp={showGraphHelp}
        helpLabel="Graph help"
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
          <ViewReferenceModelButton
            onViewReferenceModel={onViewReferenceModel}
            className="fobles-reference-graph-button fobles-reference-graph-view-reference-model"
          />
        </div>
      )}
      <GraphHelpDialog dialogRef={dialogRef} />
      <LifecycleProgressFooter harvestProgress={harvestProgress} resolveProgress={resolveProgress} elapsedSeconds={buildElapsedSeconds} buildingLabel="Building graph" />
    </div>
  );
}
