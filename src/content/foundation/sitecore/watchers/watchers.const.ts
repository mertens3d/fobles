// @source-path [fobles] src/content/foundation/sitecore/watchers/watchers.const.ts

export const SITECORE_DOM_WATCHER = {
  ATTACHMENT_CHECK_MS: 1000,
  DEBOUNCE_MS: 100,
  EVENT: {
    CHANGE: "change",
    POP_STATE: "popstate",
  },
  INPUT_EVENTS: ["input", "change"],
  MUTATION_OPTIONS: {
    attributeFilter: ["value"],
    attributes: true,
    characterData: true,
    childList: true,
    subtree: true,
  },
  PAGE_HIDE_EVENT: "pagehide",
  POP_STATE_EVENT: "popstate",
} as const;
