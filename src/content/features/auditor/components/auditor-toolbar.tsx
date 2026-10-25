import { FilterGroup, FilterShell, type FilterOption } from "../../../shared/ui/filters/filter-shell";
// @source-path [fobles] src/content/features/auditor/components/auditor-toolbar.tsx

import { ViewReferenceModelButton } from "../../../shared/ui/reference-controls/view-reference-model-button";
import { GraphFilterList } from "../../../shared/ui/reference-controls/graph-filter-list";
import type { SitecoreHarvestFiltersState } from "../../../sitecore-harvester/sitecore-harvester.types";
import type { AuditFindingStatus } from "../audit-finding.types";
import { CACHE_VALIDATION_CHECK_KEY, CACHE_VALIDATION_CHECK_LABEL } from "../checks/cache-validation-check";
import { ITEM_NAVIGATION_CHECK_KEY, ITEM_NAVIGATION_CHECK_LABEL } from "../checks/item-navigation-check";
import { ITEM_RESOLVED_CHECK_KEY, ITEM_RESOLVED_CHECK_LABEL } from "../checks/item-resolved-check";
import { REFERENCE_RESOLVED_CHECK_KEY, REFERENCE_RESOLVED_CHECK_LABEL } from "../checks/reference-resolved-check";
const CHECK_OPTIONS = [{ key: ITEM_RESOLVED_CHECK_KEY, label: ITEM_RESOLVED_CHECK_LABEL }, { key: REFERENCE_RESOLVED_CHECK_KEY, label: REFERENCE_RESOLVED_CHECK_LABEL }, { key: CACHE_VALIDATION_CHECK_KEY, label: CACHE_VALIDATION_CHECK_LABEL }, { key: ITEM_NAVIGATION_CHECK_KEY, label: ITEM_NAVIGATION_CHECK_LABEL }] as const;
export type AuditorToolbarProps = { query: string; onQueryChange: (query: string) => void; selectedChecks: ReadonlySet<string>; onToggleCheck: (checkKey: string) => void; onReset: () => void; onExport: () => void; onViewReferenceModel: () => void; onHelp: () => void; graphFilters: SitecoreHarvestFiltersState; onGraphFilterChange: (key: keyof SitecoreHarvestFiltersState, checked: boolean) => void; onClearGraphFilters: () => void; };
export function AuditorToolbar(props: AuditorToolbarProps) {
  return <FilterShell query={props.query} onQueryChange={props.onQueryChange} onReset={props.onReset} actions={<><ViewReferenceModelButton onViewReferenceModel={props.onViewReferenceModel} className="fobles-reference-graph-button fobles-reference-graph-view-reference-model" /><button type="button" className="fobles-auditor-toolbar-action" onClick={props.onHelp}>Help</button><button type="button" className="fobles-auditor-toolbar-action" onClick={props.onExport}>Export CSV</button></>}><FilterGroup label="Filter by check" options={CHECK_OPTIONS} selected={props.selectedChecks} onToggle={props.onToggleCheck} /><GraphFilterList filters={props.graphFilters} onChange={props.onGraphFilterChange} onClearFilters={props.onClearGraphFilters} /></FilterShell>;
}
