// @source-path [fobles] src/content/features/reference-graph/enrichment/enrichment.types.ts

// Counts unique GUIDs requiring enrichment - never Cytoscape nodes or DataTree nodes, since one
// GUID can back several tree nodes/graph nodes at once.
export type EnrichmentProgress = {
  completedItemCount: number;
  maxItemCount: number;
  status: "idle" | "running" | "complete";
};

export type EnrichmentProgressCallback = (progress: EnrichmentProgress) => void;

export type EnrichmentController = {
  dispose: () => void;
};

// 0 = Name unknown (highest priority), 1 = Name known but other quick-info metadata (id/template)
// missing, 2 = Name known and only Path missing (lowest priority).
export type EnrichmentPriorityRank = 0 | 1 | 2;
