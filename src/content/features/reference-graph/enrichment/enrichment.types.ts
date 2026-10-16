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
