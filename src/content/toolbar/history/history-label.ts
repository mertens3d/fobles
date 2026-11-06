import { SITECORE } from "../../../constants/sitecore.ts";
import type { HistoryItem } from "../../../shared/item-history/item-history.types.ts";
import { isWithinSitePath, matchKnownSite } from "../../../shared/known-sites/known-sites-model.ts";
import type { KnownSite } from "../../../shared/structural/structural.types.ts";
import { HISTORY_TEXT } from "./history.const.ts";

export function historyItemLabel(item: HistoryItem, sites: readonly KnownSite[]): string {
  const site = matchKnownSite(sites, item.path);
  return item.category === "Content" && isWithinSitePath(item.path, SITECORE.ITEM_KIND.PATH_ROOTS.CONTENT)
    ? `${site?.name ?? HISTORY_TEXT.UNKNOWN_SITE}${HISTORY_TEXT.SITE_SEPARATOR}${item.name}` : item.name;
}