// @source-path [fobles] src/content/item-history/item-history.const.ts

export const ITEM_HISTORY_CAPTURE = {
  ATTACHMENT_CHECK_MS: 1000,
  DEBOUNCE_MS: 100,
  INPUT_EVENTS: ["input", "change"],
  MUTATION_OPTIONS: {
    attributeFilter: ["value"],
    attributes: true,
    characterData: true,
    childList: true,
    subtree: true,
  },
  PAGE_HIDE_EVENT: "pagehide",
} as const;