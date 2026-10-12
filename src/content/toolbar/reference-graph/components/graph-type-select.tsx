// @source-path [fobles] src/content/toolbar/reference-graph/components/graph-type-select.tsx

import { CONST } from "../../../../constants/const";
import type { LayoutGraphPresetName } from "../graph.types";

let layoutSelect: HTMLSelectElement;

type GraphTypeSelectProps = { value: LayoutGraphPresetName; onChange: (value: LayoutGraphPresetName) => void; };

export function GraphTypeSelect({ value, onChange }: GraphTypeSelectProps) {
  return (
    <select
      value={value}
      className="fobles-reference-graph-select"
      onChange={(event) => onChange(event.target.value as LayoutGraphPresetName)}
    >
      {Object.entries(CONST.FOBLES.REFERENCE_GRAPH.LAYOUT_PRESETS).map(([presetName, preset]) => (
        <option key={presetName} value={presetName}>
          {preset.label}
        </option>
      ))}
    </select>
  );
}