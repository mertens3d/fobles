// @source-path [fobles] src/content/features/reference-graph/components/enrichment-progress.tsx

import type { EnrichmentProgress as EnrichmentProgressData } from "../enrichment/enrichment.types";

type EnrichmentProgressProps = {
  progress: EnrichmentProgressData | undefined;
};

// Deliberately NOT nested inside GraphToolbar's collapsible controls - rendered as its own
// top-level sibling so it can move straight into a future always-visible GraphToolbarFooter.
export function EnrichmentProgress({ progress }: EnrichmentProgressProps) {
  if (!progress || progress.status !== "running" || progress.maxItemCount === 0) {
    return null;
  }

  const percentComplete = Math.round(
    (progress.completedItemCount / progress.maxItemCount) * 100,
  );

  return (
    <div
      className="fobles-reference-graph-enrichment-progress"
      style={{
        position: "absolute",
        top: 8,
        right: 8,
        zIndex: 5,
        width: 180,
        pointerEvents: "none",
        font: "11px/1.4 sans-serif",
        color: "#203047",
        background: "rgba(255, 255, 255, 0.9)",
        borderRadius: 4,
        padding: "4px 8px",
      }}
    >
      <div>
        {`Enriching items ${progress.completedItemCount} / ${progress.maxItemCount}`}
      </div>

      <div style={{ height: 3, background: "#dbe3ef", borderRadius: 2, marginTop: 4 }}>
        <div
          style={{
            height: "100%",
            width: `${percentComplete}%`,
            background: "#2f6fed",
            borderRadius: 2,
          }}
        />
      </div>
    </div>
  );
}
