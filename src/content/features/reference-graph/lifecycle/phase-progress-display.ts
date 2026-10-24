// @source-path [fobles] src/content/features/reference-graph/lifecycle/phase-progress-display.ts

import type { PhaseProgress } from "./lifecycle.types";

export type PhaseProgressDisplay = { completed: number; max: number; percent: number };

// 0 / 0 (no work at all) reads as already complete, same as N / N - never 0%, which would
// misleadingly suggest a phase is stuck rather than simply having nothing to do.
export function computePhaseProgressDisplay(progress: PhaseProgress | undefined): PhaseProgressDisplay {
  const completed = progress?.completed ?? 0;
  const max = progress?.max ?? 0;
  const percent = max === 0 ? 100 : Math.round((completed / max) * 100);

  return { completed, max, percent };
}

// A phase with no progress object yet (never had any work to report) counts as settled, same as
// one that explicitly reached "complete" - either way there's nothing left for it to do.
function isPhaseSettled(progress: PhaseProgress | undefined): boolean {
  return progress === undefined || progress.status === "complete";
}

// The whole progress section is only visible WHILE lifecycle work is active - once both phases
// are settled it disappears entirely rather than occupying toolbar space permanently.
export function isLifecycleProgressActive(
  harvestProgress: PhaseProgress | undefined,
  resolveProgress: PhaseProgress | undefined,
): boolean {
  return !isPhaseSettled(harvestProgress) || !isPhaseSettled(resolveProgress);
}
