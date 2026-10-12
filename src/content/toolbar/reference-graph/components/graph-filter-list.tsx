// @source-path [fobles] src/content/toolbar/reference-graph/components/graph-filter-list.tsx

import { REFERENCE_GRAPH } from "../../../../constants/graph.const";
import type { SitecoreHarvestFiltersState } from "../../../sitecore-harvester/sitecore-harvester.types";

type GraphFilterListProps = {
  filters: SitecoreHarvestFiltersState;
  onChange: (
    key: keyof SitecoreHarvestFiltersState,
    checked: boolean,
  ) => void;
  onClearFilters: () => void;
};
export function GraphFilterList({
    filters,
    onChange,
    onClearFilters,
}: GraphFilterListProps) {
    return (
        <div className="fobles-reference-graph-filters">
            <button
                type="button"
                className="fobles-reference-graph-button"
                onClick={onClearFilters}
            >
                Clear
            </button>

            {REFERENCE_GRAPH.FILTER_DEFS.map((filter) => (
                <label
                    key={filter.key}
                    className="fobles-reference-graph-filter"
                >
                    <input
                        type="checkbox"
                        checked={filters[filter.key] ?? false}
                        onChange={(event) =>
                            onChange(
                                filter.key,
                                event.currentTarget.checked,
                            )
                        }
                    />
                    {filter.label}
                </label>
            ))}
        </div>
    );
}