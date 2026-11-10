// @source-path [fobles] src/content/toolbar/history/history.const.ts

export const HISTORY_CLASS = {
  ACTIONS: "fobles-history-actions",
  EMPTY: "fobles-history-empty",
  ERROR: "fobles-history-error",
  GROUP: "fobles-history-group",
  LINK: "fobles-history-link",
  PANEL: "fobles-history-panel",
  REMOVE: "fobles-history-remove",
  ROW: "fobles-history-row",
  TAB: "fobles-history-tab",
  TRIGGER: "fobles-history-trigger",
} as const;

export const HISTORY_SELECTOR = { PANEL: `.${HISTORY_CLASS.PANEL}` } as const;

export const HISTORY_TEXT = {
  CLEAR: "Clear history",
  EMPTY: "No item history yet",
  ERROR: "Unable to load or update item history.",
  GUID: "GUID",
  INVALID_ID: "Invalid history item ID",
  LAST_VISITED: "Last visited",
  PATH: "Path",
  REMOVE: "Remove",
  SITE_SEPARATOR: ": ",
  TITLE: "History",
  UNKNOWN_SITE: "_",
} as const;

export const HISTORY_UI = {
  ERROR_LOG: "Item history: UI failed",
  PANEL_ID: "fobles-history-panel",
  TOOLTIP_DELAY: 0 // needs verification from Agent
} as const;