// @source-path [fobles] src/shared/item-history/item-history-repository.ts

import { getStorageValue, onStorageChange } from "../storage/storage.ts";
import { requestHistoryChange } from "./item-history-client.ts";
import { historyStorageKey, normalizeHistoryItems } from "./item-history-model.ts";
import type { HistoryChange, HistoryItem, HistoryScope } from "./item-history.types.ts";

/** Reads canonical local history for one origin/database; rejects if storage is unavailable. */
export async function getHistory(scope: HistoryScope): Promise<HistoryItem[]> {
  const key = historyStorageKey(scope);
  const values = await getStorageValue([key], "local", true);
  return normalizeHistoryItems(values[key]);
}

/** Subscribes to local history changes (not an initial read); returns an unsubscribe function. */
export function subscribeHistory(scope: HistoryScope, callback: (history: HistoryItem[]) => void): () => void {
  return onStorageChange(historyStorageKey(scope), (value) => callback(normalizeHistoryItems(value)), "local");
}

/** Delegates mutation to the shared background writer; never performs a per-tab read/modify/write. */
export function mutateHistory(scope: HistoryScope, change: HistoryChange): Promise<HistoryItem[]> {
  return requestHistoryChange(scope, change);
}