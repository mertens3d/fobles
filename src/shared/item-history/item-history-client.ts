// @source-path [fobles] src/shared/item-history/item-history-client.ts

import { FOBLES_ITEM_HISTORY_CHANGE } from "./item-history.const.ts";
import { normalizeHistoryChange, normalizeHistoryItems, normalizeHistoryScope } from "./item-history-model.ts";
import type { HistoryChange, HistoryChangeMessage, HistoryItem, HistoryScope } from "./item-history.types.ts";

/** Requests a background-serialized mutation; resolves with history or rejects on failure. */
export async function requestHistoryChange(scope: HistoryScope, change: HistoryChange): Promise<HistoryItem[]> {
  const message: HistoryChangeMessage = {
    type: FOBLES_ITEM_HISTORY_CHANGE,
    scope: normalizeHistoryScope(scope),
    change: normalizeHistoryChange(change),
  };
  const response: unknown = await chrome.runtime.sendMessage(message);
  if (typeof response !== "object" || response === null || !("ok" in response) || response.ok !== true ||
    !("history" in response) || !Array.isArray(response.history)) {
    const error = typeof response === "object" && response !== null && "error" in response &&
      typeof response.error === "string" ? response.error : "Item history writer did not respond";
    throw new Error(error);
  }
  return normalizeHistoryItems(response.history);
}