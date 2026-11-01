// @source-path [fobles] src/content/foundation/reference-data/processing/classification/classification-limits.const.ts

// The cap is on unique templates/items discovered, not recursion depth or ancestor-chain length.
export const CLASSIFICATION_LIMITS = {
  MAX_UNIQUE_TEMPLATES: 100,
  MAX_VISITED_ANCESTORS: 100,
} as const;
