// @source-path [fobles] src/content/shared/ui/reference-controls/lifecycle-progress-footer.tsx

import { useState } from "react";
import type { PhaseProgress } from "../../../foundation/reference-data/progress/lifecycle.types";
import { PhaseProgressBar } from "./phase-progress-bar";

export type LifecycleProgressFooterProps = {
  harvestProgress: PhaseProgress | undefined;
  resolveProgress: PhaseProgress | undefined;
  elapsedSeconds: number | undefined;
  buildingLabel: string;
};

export function LifecycleProgressFooter({
  harvestProgress,
  resolveProgress,
  elapsedSeconds,
  buildingLabel,
}: LifecycleProgressFooterProps) {
  const [expanded, setExpanded] = useState(false);
  const activeLabel = resolveProgress && resolveProgress.status !== "complete" ? "Cache Validation" : "Reference Harvesting";
  const activeProgress = activeLabel === "Cache Validation" ? resolveProgress : harvestProgress;
  return (
    <div className="fobles-reference-graph-toolbar-footer">
      <button type="button" className="fobles-reference-graph-toolbar-footer-phases" aria-expanded={expanded}
        title="Click for progress details" onClick={() => setExpanded((value) => !value)}>
        <PhaseProgressBar label={activeLabel} progress={activeProgress} displayLabel={buildingLabel} />
      </button>
      {expanded && <div className="fobles-reference-graph-progress-details">
        {harvestProgress?.status !== "complete" && <PhaseProgressBar label="Reference Harvesting" progress={harvestProgress} />}
        {resolveProgress?.status !== "complete" && <PhaseProgressBar label="Cache Validation" progress={resolveProgress} />}
      </div>}
      <div className="fobles-reference-graph-build-time">
        {elapsedSeconds !== undefined ? `Built in ${elapsedSeconds.toFixed(3)}s` : buildingLabel}
      </div>
    </div>
  );
}
