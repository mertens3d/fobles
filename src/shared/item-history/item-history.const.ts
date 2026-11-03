// @source-path [fobles] src/shared/item-history/item-history.const.ts

import { SITECORE } from "../../constants/sitecore.ts";

export const FOBLES_ITEM_HISTORY_CHANGE = "FOBLES_ITEM_HISTORY_CHANGE";

export const ITEM_HISTORY = {
  CATEGORIES: ["Content", "Templates", "Layouts", "PowerShell"],
  MAX_ITEMS: 20,
  STORAGE_KEY_PREFIX: "fobles:item-history:",
} as const;

export const ITEM_HISTORY_PATH_ROOTS = {
  LAYOUTS: `${SITECORE.RELATIVE_PATHS_ENCODED.ROOT}/layout`,
  POWERSHELL: `${SITECORE.RELATIVE_PATHS_ENCODED.ROOT}/system/modules/powershell`,
  ROOT: SITECORE.RELATIVE_PATHS_ENCODED.ROOT,
  TEMPLATES: SITECORE.CLASSIFICATION.PATH_ROOTS.TEMPLATES,
} as const;