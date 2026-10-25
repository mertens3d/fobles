// @source-path [fobles] src/content/features/reference-model/tree-child-node.types.ts

// A single row read from an expanded Content Editor tree glyph - generic Sitecore tree-expansion
// data, not Reference-Graph-specific (consumed by macros/tree-expand-macro.ts and the harvester).
export type TreeChildNode = {
  name: string | undefined;
  itemId: string;
  // Diagnostics only: the raw tree-row outerHTML this was parsed from.
  rawMarkup: string | undefined;
};
