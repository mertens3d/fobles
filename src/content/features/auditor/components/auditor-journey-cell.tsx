// @source-path [fobles] src/content/features/auditor/components/auditor-journey-cell.tsx

import type { JourneyStage } from "../auditor-grid/auditor-grid.types";

const JOURNEY_RANK: Record<JourneyStage, number> = { referenced: 1, cached: 2, live: 3, tested: 4 };

export function AuditorJourneyCell({ stage }: { stage: JourneyStage }) {
  const count = JOURNEY_RANK[stage];
  const title = `${stage[0].toUpperCase()}${stage.slice(1)}: ${count} of 4 lifecycle stages reached`;

  return (
    <span className={`fobles-auditor-journey fobles-auditor-journey--${stage}`} title={title} aria-label={title}>
      {[0, 1, 2, 3].map((index) => <span key={index} className={index < count ? "is-complete" : undefined} />)}
    </span>
  );
}
