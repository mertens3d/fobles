// @source-path [fobles] src/background/item-history-registration.ts

import { FOBLES_ITEM_HISTORY_CHANGE } from "../shared/item-history/item-history.const.ts";
import {
  historyStorageKey,
  normalizeHistoryChange,
  normalizeHistoryScope,
  upsertHistoryItem,
} from "../shared/item-history/item-history-model.ts";
import { getHistory } from "../shared/item-history/item-history-repository.ts";
import type {
  HistoryChange,
  HistoryChangeResponse,
  HistoryItem,
  HistoryScope,
} from "../shared/item-history/item-history.types.ts";
import { setStorageValue } from "../shared/storage/storage.ts";

let writerQueue: Promise<void> = Promise.resolve();

function validateSender(scope: HistoryScope, sender: chrome.runtime.MessageSender): void {
  const senderUrl = sender.url ?? sender.tab?.url;
  const senderScope = normalizeHistoryScope({ origin: senderUrl, database: scope.database });
  if (senderScope.origin !== scope.origin || (sender.id !== undefined && sender.id !== chrome.runtime.id) ||
    (sender.origin !== undefined && sender.origin !== scope.origin)) {
    throw new TypeError("Item history sender origin does not match scope");
  }
}

async function writeHistory(scope: HistoryScope, change: HistoryChange): Promise<HistoryItem[]> {
  const history = await getHistory(scope);
  let next: HistoryItem[] = [];
  if (change.action === "visit") {
    next = upsertHistoryItem(history, change.visit, Date.now());
  } else if (change.action === "remove") {
    next = history.filter((item) => item.id !== change.id);
  }
  await setStorageValue({ [historyStorageKey(scope)]: next }, "local", true);
  return next;
}

function enqueueHistoryChange(scope: HistoryScope, change: HistoryChange): Promise<HistoryItem[]> {
  const result = writerQueue.then(() => writeHistory(scope, change));
  writerQueue = result.then(() => undefined, () => undefined);
  return result;
}

function handleHistoryMessage(
  message: unknown,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response: HistoryChangeResponse) => void,
): boolean {
  console.warn("[Fobles][history-writer] message received", JSON.stringify(message)?.slice(0, 200), sender.url);
  const trace = ((globalThis as Record<string, unknown>).__historyTrace ??= []) as string[];
  trace.push(`received ${JSON.stringify(message)?.slice(0, 120)} from ${sender.url}`);
  let keepChannelOpen = false;
  if (typeof message === "object" && message !== null && "type" in message &&
    message.type === FOBLES_ITEM_HISTORY_CHANGE) {
    try {
      const scope = normalizeHistoryScope("scope" in message ? message.scope : undefined);
      const change = normalizeHistoryChange("change" in message ? message.change : undefined);
      validateSender(scope, sender);
      void enqueueHistoryChange(scope, change).then(
        (history) => {
          console.warn("[Fobles][history-writer] write ok", history.length);
          trace.push(`write ok ${history.length}`);
          sendResponse({ ok: true, history });
        },
        (error: unknown) => {
          console.warn("[Fobles][history-writer] write failed", error);
          trace.push(`write failed: ${String(error)}`);
          sendResponse({ ok: false, error: error instanceof Error ? error.message : "History write failed" });
        },
      );
      keepChannelOpen = true;
    } catch (error) {
      console.warn("[Fobles][history-writer] invalid request", error);
      trace.push(`invalid request: ${String(error)}`);
      sendResponse({ ok: false, error: error instanceof Error ? error.message : "Invalid history request" });
    }
  }
  return keepChannelOpen;
}

chrome.runtime.onMessage.addListener(handleHistoryMessage);