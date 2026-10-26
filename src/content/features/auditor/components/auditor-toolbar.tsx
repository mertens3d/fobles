// @source-path [fobles] src/content/features/auditor/components/auditor-toolbar.tsx
import { useEffect, useState } from "react";
import type { SitecoreHarvestFiltersState } from "../../../foundation/harvesting/sitecore-harvester.types";
import { FilterGroup } from "../../../shared/ui/filters/filter-shell";
import { GraphFilterList } from "../../../shared/ui/reference-controls/graph-filter-list";
import { ViewReferenceModelButton } from "../../../shared/ui/reference-controls/view-reference-model-button";
import { getAuditorControlsExpanded, setAuditorControlsExpanded } from "../auditor-ui-settings";
import { CACHE_VALIDATION_CHECK_KEY, CACHE_VALIDATION_CHECK_LABEL } from "../checks/cache-validation-check";
import { ITEM_NAVIGATION_CHECK_KEY, ITEM_NAVIGATION_CHECK_LABEL } from "../checks/item-navigation-check";
import { ITEM_RESOLVED_CHECK_KEY, ITEM_RESOLVED_CHECK_LABEL } from "../checks/item-resolved-check";
import { REFERENCE_RESOLVED_CHECK_KEY, REFERENCE_RESOLVED_CHECK_LABEL } from "../checks/reference-resolved-check";
const CHECK_OPTIONS = [
  { key: ITEM_RESOLVED_CHECK_KEY, label: ITEM_RESOLVED_CHECK_LABEL },
  { key: REFERENCE_RESOLVED_CHECK_KEY, label: REFERENCE_RESOLVED_CHECK_LABEL },
  { key: CACHE_VALIDATION_CHECK_KEY, label: CACHE_VALIDATION_CHECK_LABEL },
  { key: ITEM_NAVIGATION_CHECK_KEY, label: ITEM_NAVIGATION_CHECK_LABEL },
] as const;
export type AuditorToolbarProps = {
  query: string; onQueryChange: (query: string) => void; selectedChecks: ReadonlySet<string>; onToggleCheck: (checkKey: string) => void;
  onReset: () => void; onExport: () => void; onViewReferenceModel: () => void; graphFilters: SitecoreHarvestFiltersState;
  onGraphFilterChange: (key: keyof SitecoreHarvestFiltersState, checked: boolean) => void; onClearGraphFilters: () => void;
};
export function AuditorToolbar(props: AuditorToolbarProps) {
  const [expanded, setExpanded] = useState(true);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  useEffect(() => { let active = true; void getAuditorControlsExpanded().then((storedExpanded) => { if (!active) return; setExpanded(storedExpanded); setSettingsLoaded(true); }); return () => { active = false; }; }, []);
  function toggleExpanded(): void { const nextExpanded = !expanded; setExpanded(nextExpanded); void setAuditorControlsExpanded(nextExpanded); }
  return (
    <div className="fobles-auditor-toolbar-shell">
      <div className="fobles-auditor-toolbar-search-row"><input type="search" className="fobles-filter-search" placeholder="Search..." aria-label="Search audit results" value={props.query} onChange={(event) => props.onQueryChange(event.target.value)} /></div>
      <div className="fobles-auditor-controls-shell">
        <button type="button" className="fobles-auditor-toolbar-header" aria-expanded={expanded} disabled={!settingsLoaded} onClick={toggleExpanded}><span>Controls</span><span aria-hidden="true">{expanded ? "▴" : "▾"}</span></button>
        {expanded ? <div className="fobles-auditor-toolbar-controls">
          <button type="button" className="fobles-filter-reset" onClick={props.onReset}>Reset</button>
          <FilterGroup label="Filter by check" options={CHECK_OPTIONS} selected={props.selectedChecks} onToggle={props.onToggleCheck} />
          <GraphFilterList filters={props.graphFilters} onChange={props.onGraphFilterChange} onClearFilters={props.onClearGraphFilters} />
          <div className="fobles-filter-actions"><ViewReferenceModelButton onViewReferenceModel={props.onViewReferenceModel} className="fobles-reference-graph-button fobles-reference-graph-view-reference-model" /><button type="button" className="fobles-auditor-toolbar-action" onClick={props.onExport}>Export CSV</button></div>
        </div> : null}
      </div>
    </div>
  );
}
