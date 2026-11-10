import type { HistoryChangeResponse } from "../../../src/shared/item-history/item-history.types";

export type MessageListener = (
  message: unknown,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response: HistoryChangeResponse) => void
) => boolean;

export type StorageListener = (changes: Record<string, chrome.storage.StorageChange>, areaName: string) => void;
