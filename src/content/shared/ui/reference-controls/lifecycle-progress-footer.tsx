// @source-path [fobles] src/content/shared/ui/reference-controls/lifecycle-progress-footer.tsx

import type { PhaseProgress } from "../../../foundation/reference-data/progress/lifecycle.types";
import { PhaseProgressBar } from "./phase-progress-bar";

export type LifecycleProgressFooterProps = {
  harvestProgress: PhaseProgress | undefined;
  resolveProgress: PhaseProgress | undefined;
  elapsedSeconds: number | undefined;
  buildingLabel: string;
};

export function LifecycleProgressFooter({ harvestProgress, resolveProgress, elapsedSeconds, buildingLabel }: LifecycleProgressFooterProps) {
  return (
    <div className="fobles-reference-graph-toolbar-footer">
      <div className="fobles-reference-graph-toolbar-footer-phases">
        <PhaseProgressBar label="Reference Harvesting" progress={harvestProgress} />
        <PhaseProgressBar label="Cache Validation" progress={resolveProgress} />
      </div>
      <div className="fobles-reference-graph-build-time">{elapsedSeconds !== undefined ? `Built in ${elapsedSeconds.toFixed(3)}s` : buildingLabel}</div>
    </div>
  );
}
