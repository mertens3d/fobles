// @source-path [fobles] src/content/shared/ui/json-tree/json-tree.const.ts

export const JSON_TREE = {
  DEFAULT_OPEN_DEPTH: 3,
  COLLAPSE_ALL_DEPTH: 1,
  EXPAND_ALL_DEPTH: Number.POSITIVE_INFINITY,
  MAX_INLINE_STRING_CHARS: 400,
  PREVIEW_MAX_ENTRIES: 4,
  PREVIEW_MAX_STRING_CHARS: 24,
  GLYPH: { OPEN: "\u25BE", CLOSED: "\u25B8" },
  CLASS: {
    ROOT: "fobles-json-tree",
    LINE: "fobles-json-tree-line",
    TOGGLE: "fobles-json-tree-toggle",
    SPACER: "fobles-json-tree-spacer",
    KEY: "fobles-json-tree-key",
    SUMMARY: "fobles-json-tree-summary",
    CHILDREN: "fobles-json-tree-children",
    STRING: "fobles-json-tree-string",
    NUMBER: "fobles-json-tree-number",
    LITERAL: "fobles-json-tree-literal",
    MORE: "fobles-json-tree-more",
  },
  TEXT: {
    EXPAND: "Expand",
    COLLAPSE: "Collapse",
    EMPTY_OBJECT: "{}",
    EMPTY_ARRAY: "[]",
    OBJECT_LABEL: "Object",
    SHOW_ALL: "show all",
  },
} as const;
