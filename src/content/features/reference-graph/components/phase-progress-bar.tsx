// @source-path [fobles] src/content/features/reference-graph/components/phase-progress-bar.tsx

import { computePhaseProgressDisplay } from "../lifecycle/phase-progress-display";
import type { PhaseProgress } from "../lifecycle/lifecycle.types";

type PhaseProgressBarProps = { label: string; progress: PhaseProgress | undefined };

// Shared visual language for every lifecycle phase (Harvesting, Resolving) - always rendered,
// even with no work or once complete, so the two rows never jump around in the toolbar.
export function PhaseProgressBar({ label, progress }: PhaseProgressBarProps) {
  const { completed, max, percent } = computePhaseProgressDisplay(progress);

  return (
    <div className="fobles-reference-graph-enrichment-progress">
      <div className="fobles-reference-graph-enrichment-progress-content">
        <div className="fobles-reference-graph-enrichment-progress-label">
          {`${label} ${completed} / ${max}`}
        </div>

        <div className="fobles-reference-graph-enrichment-progress-track">
          <div className="fobles-reference-graph-enrichment-progress-value" style={{ width: `${percent}%` }} />
        </div>
      </div>
    </div>
  );
}
