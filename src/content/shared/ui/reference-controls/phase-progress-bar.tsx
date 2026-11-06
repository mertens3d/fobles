// @source-path [fobles] src/content/shared/ui/reference-controls/phase-progress-bar.tsx

import { computePhaseProgressDisplay } from "./phase-progress-display";
import type { PhaseProgressBarProps } from "./phase-progress-bar.types";

export function PhaseProgressBar({ label, progress, displayLabel }: PhaseProgressBarProps) {
  const { completed, max, percent } = computePhaseProgressDisplay(progress);

  return (
    <div className="fobles-reference-graph-enrichment-progress">
      <div className="fobles-reference-graph-enrichment-progress-content">
        <div className="fobles-reference-graph-enrichment-progress-label">{displayLabel ?? `${label} ${completed} / ${max}`}</div>

        <div className="fobles-reference-graph-enrichment-progress-track" role="progressbar" aria-label={label}
          aria-valuemin={0} aria-valuemax={max || 1} aria-valuenow={max === 0 ? 1 : completed}>
          <div className="fobles-reference-graph-enrichment-progress-value" style={{ width: `${percent}%` }} />
        </div>
      </div>
    </div>
  );
}
