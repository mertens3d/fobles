// @source-path [fobles] src/content/foundation/reference-data/processing/processor/reference-model-processing-health.ts

import type { HealthReport } from "../../../diagnostics/diagnostics.types";

export function buildReferenceModelProcessingHealth(
  disposed: boolean,
  activeCount: number,
  lastProgressAt: number,
): HealthReport {
  const checkedAt = performance.now();
  const noProgressMs = Math.round(checkedAt - lastProgressAt);
  const degraded = !disposed && activeCount > 0 && noProgressMs >= 20000;

  return {
    owner: "ReferenceModelProcessor",
    state: degraded ? "degraded" : "healthy",
    checkedAt,
    lastProgressAt,
    noProgressMs,
    reason: degraded ? "Reference Harvesting candidates are waiting for worker recovery or terminal job results" : undefined,
    activeCount,
    recoveryCount: 0,
  };
}
