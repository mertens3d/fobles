// @source-path [fobles] src/content/features/reference-graph/data-tree/data-tree-fan-out-limits.ts

// Caps on potentially-unbounded relationships included in the DataTree. Only GUIDs actually
// represented in the resulting tree become enrichment candidates, so these limits also bound
// enrichment work, not just graph size.
export const DATA_TREE_FAN_OUT_LIMITS = {
  MAX_CHILDREN_PER_ITEM: 50,
  MAX_REFERRERS_PER_ITEM: 50,
} as const;
