// @source-path [fobles] src/content/shared/ui/reference-controls/lifecycle-progress-footer.tsx
import type { PhaseProgress } from "../../../foundation/reference-data/progress/lifecycle.types";
import { isLifecycleProgressActive } from "./phase-progress-display";
import { PhaseProgressBar } from "./phase-progress-bar";
export type LifecycleProgressFooterProps = { harvestProgress: PhaseProgress | undefined; resolveProgress: PhaseProgress | undefined; elapsedSeconds: number | undefined; buildingLabel: string; };
export function LifecycleProgressFooter({ harvestProgress, resolveProgress, elapsedSeconds, buildingLabel }: LifecycleProgressFooterProps) {
  const progressVisible = isLifecycleProgressActive(harvestProgress, resolveProgress);
  return <div className="fobles-reference-graph-toolbar-footer">{progressVisible ? <div className="fobles-reference-graph-toolbar-footer-phases"><PhaseProgressBar label="Harvesting" progress={harvestProgress} /><PhaseProgressBar label="Resolving" progress={resolveProgress} /></div> : null}<div className="fobles-reference-graph-build-time">{elapsedSeconds !== undefined ? `Built in ${elapsedSeconds.toFixed(3)}s` : buildingLabel}</div></div>;
}
