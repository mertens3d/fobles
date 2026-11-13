// @source-path [fobles] src/shared/item-history/item-history.const.ts

import { SITECORE } from "../../constants/sitecore.const.ts";

export const FOBLES_ITEM_HISTORY_CHANGE = "FOBLES_ITEM_HISTORY_CHANGE";

export const ITEM_HISTORY = {
  CATEGORIES: ["Content", "Layout", "Media Library", "System", "Templates"],
  MAX_ITEMS_BY_CATEGORY: {
    Content: 6,
    "Media Library": 5,
    Templates: 5,
    Layout: 5,
    System: 5,
  },
  COLLAPSED_STORAGE_KEY: "fobles:item-history:collapsed",
  STORAGE_KEY_PREFIX: "fobles:item-history:",
} as const;

export const ITEM_HISTORY_PATH_ROOTS = {
  LAYOUT: `${SITECORE.RELATIVE_PATHS_ENCODED.ROOT}/layout`,
  MEDIA_LIBRARY: `${SITECORE.RELATIVE_PATHS_ENCODED.ROOT}/media library`,
  SYSTEM: `${SITECORE.RELATIVE_PATHS_ENCODED.ROOT}/system`,
  ROOT: SITECORE.RELATIVE_PATHS_ENCODED.ROOT,
  TEMPLATES: SITECORE.ITEM_KIND.PATH_ROOTS.TEMPLATES,
} as const;