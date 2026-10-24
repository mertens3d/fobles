// @source-path [fobles] src/content/features/reference-graph/lifecycle/lifecycle.types.ts

export type PhaseStatus = "idle" | "running" | "complete";

// Counts unique Sitecore items/GUIDs, never Cytoscape nodes or DataTree nodes - one item can
// back several tree/graph nodes at once.
export type PhaseProgress = {
  completed: number;
  max: number;
  status: PhaseStatus;
};

// UI ordering is always Harvesting -> Resolving, regardless of which phase has work.
export type ReferenceGraphLifecycleProgress = {
  harvesting: PhaseProgress;
  resolving: PhaseProgress;
};
