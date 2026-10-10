import { REFERENCE_GRAPH } from "../../../constants/graph.const";
import type { ReferenceGraphFiltersState } from "./graph.types";
type GraphFilterListProps = { filters: ReferenceGraphFiltersState; onChange: (key: keyof ReferenceGraphFiltersState, checked: boolean) => void };
export function GraphFilterList({ filters, onChange }: GraphFilterListProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11 }}>
      {" "}
      {REFERENCE_GRAPH.FILTER_DEFS.map((filter) => (
        <label key={filter.key} style={{ display: "inline-flex", alignItems: "center", gap: 3, cursor: "pointer", color: "#203047" }}>
          {" "}
          <input type="checkbox" checked={filters[filter.key]} onChange={(event) => onChange(filter.key, event.target.checked)} /> {filter.label}{" "}
        </label>
      ))}{" "}
    </div>
  );
}
