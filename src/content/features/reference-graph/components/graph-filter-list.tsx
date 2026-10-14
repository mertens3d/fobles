// @source-path [fobles] src/content/features/reference-graph/components/graph-filter-list.tsx

import { CONST } from "../../../../constants/const";
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

            {CONST.FOBLES.REFERENCE_GRAPH.FILTER_DEFS.map((filter) => (
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