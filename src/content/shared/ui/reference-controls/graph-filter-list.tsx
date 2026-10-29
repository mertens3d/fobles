// @source-path [fobles] src/content/shared/ui/reference-controls/graph-filter-list.tsx

import { CONST } from "../../../../constants/const";
import type { SitecoreHarvestFiltersState } from "../../../foundation/harvesting/sitecore-harvester.types";

type GraphFilterListProps = {
  filters: SitecoreHarvestFiltersState;
  onChange: (key: keyof SitecoreHarvestFiltersState, checked: boolean) => void;
  onClearFilters: () => void;
  clearLabel?: string;
};

export function GraphFilterList({ filters, onChange, onClearFilters, clearLabel = "Clear" }: GraphFilterListProps) {
  return (
    <div className="fobles-filter-list">
      <button type="button" className="fobles-filter-reset" onClick={onClearFilters}>{clearLabel}</button>
      {CONST.FOBLES.REFERENCE_GRAPH.FILTER_DEFS.map((filter) => (
        <label key={filter.key}>
          <input type="checkbox" checked={filters[filter.key]} onChange={(event) => onChange(filter.key, event.currentTarget.checked)} />
          {filter.label}
        </label>
      ))}
    </div>
  );
}
