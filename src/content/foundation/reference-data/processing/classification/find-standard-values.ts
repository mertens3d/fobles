// @source-path [fobles] src/content/foundation/reference-data/processing/classification/find-standard-values.ts

import { CONST } from "../../../../../constants/const.ts";

export type StandardValuesCandidate = { scItemName: string | undefined };

// "__Standard Values" is a child item, not a field - the caller already has childItems (the
// existing `children` fact); this just finds the one with the well-known name.
export function findStandardValues<T extends StandardValuesCandidate>(childItems: readonly T[]): T | undefined {
  return childItems.find((child) => child.scItemName === CONST.SITECORE.CLASSIFICATION.ITEM_NAMES.STANDARD_VALUES);
}
