// @source-path [fobles] src/content/toolbar/history/history-navigation.ts

import { SITECORE } from "../../../constants/sitecore.ts";
import { normalizeHistoryId } from "../../../shared/item-history/item-history-model.ts";
import type { HistoryScope } from "../../../shared/item-history/item-history.types.ts";
import { openFoblesUrl } from "../../features/augmentor/helper";
import { HISTORY_TEXT } from "./history.const.ts";

export function historyGuid(id: string): string {
  const normalized = normalizeHistoryId(id);
  if (!normalized) {
    throw new TypeError(HISTORY_TEXT.INVALID_ID);
  }
  return `{${normalized.toUpperCase()}}`;
}

export function buildHistoryUrl(scope: HistoryScope, id: string): string {
  const url = new URL(SITECORE.RELATIVE_PATHS_ENCODED.CONTENT_EDITOR_LEGACY, scope.origin);
  url.searchParams.set(SITECORE.SEARCH_PARAMS.BROWSER_WINDOW, "1");
  url.searchParams.set(SITECORE.SEARCH_PARAMS.FOCUSED_ITEM, historyGuid(id));
  url.searchParams.set(SITECORE.SEARCH_PARAMS.CONTENT_DATABASE, scope.database);
  return url.href;
}

export function navigateHistory(scope: HistoryScope, id: string, event: MouseEvent): Promise<void> {
  return openFoblesUrl(buildHistoryUrl(scope, id), event);
}