// @source-path [fobles] src/content/shared/ui/json-tree/json-tree.const.ts
export const JSON_TREE = {
  DEFAULT_OPEN_DEPTH: 3,
  COLLAPSE_ALL_DEPTH: 1,
  EXPAND_ALL_DEPTH: Number.POSITIVE_INFINITY,
  MAX_INLINE_STRING_CHARS: 400,
  PREVIEW_MAX_ENTRIES: 4,
  PREVIEW_MAX_STRING_CHARS: 24,
  STYLE_ELEMENT_ID: "fobles-json-tree-style",
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

export const JSON_TREE_STYLE = `
.${JSON_TREE.CLASS.ROOT}{font:12px/1.6 Consolas,monospace}
.${JSON_TREE.CLASS.LINE}{display:flex;align-items:baseline;gap:4px;min-width:0}
.${JSON_TREE.CLASS.TOGGLE},.${JSON_TREE.CLASS.SPACER}{flex:0 0 14px;width:14px}
.${JSON_TREE.CLASS.TOGGLE}{padding:0;border:0;background:transparent;color:inherit;font-size:11px;line-height:1;cursor:pointer}
.${JSON_TREE.CLASS.KEY}{color:#8ab4f8;white-space:nowrap}
.${JSON_TREE.CLASS.SUMMARY}{min-width:0;overflow-wrap:anywhere;cursor:pointer;opacity:.85}
.${JSON_TREE.CLASS.CHILDREN}{margin-left:14px;padding-left:6px;border-left:1px solid rgba(255,255,255,.14)}
.${JSON_TREE.CLASS.STRING}{color:#f4b183;overflow-wrap:anywhere;white-space:pre-wrap;user-select:text}
.${JSON_TREE.CLASS.NUMBER}{color:#b5e3a8}
.${JSON_TREE.CLASS.LITERAL}{color:#9cc4ff}
.${JSON_TREE.CLASS.MORE}{margin-left:6px;padding:0;border:0;background:transparent;color:#8ab4f8;font:inherit;text-decoration:underline;cursor:pointer}
`;
