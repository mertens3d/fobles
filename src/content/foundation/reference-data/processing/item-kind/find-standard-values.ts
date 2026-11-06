import { SITECORE } from "../../../../../constants/sitecore.ts";
import type { StandardValuesCandidate } from "./item-kind.types.ts";

export type { StandardValuesCandidate } from "./item-kind.types.ts";

export function findStandardValues<T extends StandardValuesCandidate>(childItems: readonly T[]): T | undefined {
  return childItems.find((child) => child.scItemName === SITECORE.ITEM_KIND.ITEM_NAMES.STANDARD_VALUES);
}