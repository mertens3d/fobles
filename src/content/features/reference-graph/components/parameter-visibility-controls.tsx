// @source-path [fobles] src/content/features/reference-graph/components/parameter-visibility-controls.tsx

import type {
  GraphParameterVisibilitySettings,
} from "../graph-parameter-visibility-settings";

type ParameterVisibilityControlsProps = {
  settings: GraphParameterVisibilitySettings;
  onChange: (
    settings: GraphParameterVisibilitySettings,
  ) => void;
};

export function ParameterVisibilityControls({
  settings,
  onChange,
}: ParameterVisibilityControlsProps) {
  return (
    <div className="fobles-reference-graph-parameter-filters">
      <label className="fobles-reference-graph-filter">
        <input
          type="checkbox"
          checked={settings.hideEmptyParameters}
          onChange={(event) => {
            onChange({
              ...settings,
              hideEmptyParameters: event.currentTarget.checked,
            });
          }}
        />
        Hide empty parameters
      </label>

      <label className="fobles-reference-graph-filter">
        <input
          type="checkbox"
          checked={settings.hideNonGuidParameters}
          onChange={(event) => {
            onChange({
              ...settings,
              hideNonGuidParameters: event.currentTarget.checked,
            });
          }}
        />
        Hide non-GUID parameters
      </label>
    </div>
  );
}