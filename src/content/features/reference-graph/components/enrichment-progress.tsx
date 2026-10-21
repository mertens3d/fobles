// @source-path [Fobles] src/content/features/reference-graph/components/enrichment-progress.tsx


import { CONST } from "../../../../constants/const";
import type { EnrichmentProgress as EnrichmentProgressData } from "../enrichment/enrichment.types";

type EnrichmentProgressProps = { progress: EnrichmentProgressData | undefined };



export function EnrichmentProgress({ progress }: EnrichmentProgressProps) {
  if (!progress || progress.status !== "running" || progress.maxItemCount === 0) {
    return null;
  }

  const percentComplete = Math.round((progress.completedItemCount / progress.maxItemCount) * 100);

  return (
    <div className="fobles-reference-graph-enrichment-progress">
      <img className="fobles-reference-graph-enrichment-progress-spinner" src={CONST.SITECORE.ICONS.SPINNER_SRC} alt="" aria-hidden="true" />

      <div className="fobles-reference-graph-enrichment-progress-content">
        <div className="fobles-reference-graph-enrichment-progress-label">
          {`Enriching ${progress.completedItemCount} / ${progress.maxItemCount}`}
        </div>

        <div className="fobles-reference-graph-enrichment-progress-track">
          <div className="fobles-reference-graph-enrichment-progress-value" style={{ width: `${percentComplete}%` }} />
        </div>
      </div>
    </div>
  );
}
