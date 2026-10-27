// @source-path [fobles] src/content/shared/ui/details/details-panel.const.ts
export const DETAILS_PANEL = {
  COPIED_RESET_MS: 1500,
  CLASS: {
    ROOT: "fobles-reference-graph-node-details",
    HEADER: "fobles-reference-graph-node-details-header",
    ROW: "fobles-reference-graph-node-details-row",
    BUTTON: "fobles-reference-graph-button",
    COPY: "fobles-reference-graph-button fobles-reference-graph-node-details-copy",
  },
  TEXT: {
    COPY: "Copy",
    COPIED: "Copied!",
  },
  ACTIONS_STYLE: { display: "flex", alignItems: "center", gap: 8, marginLeft: "auto" },
} as const;
