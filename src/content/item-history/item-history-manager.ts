// @source-path [fobles] src/content/item-history/item-history-manager.ts

import { requestHistoryChange } from "../../shared/item-history/item-history-client.ts";
import { extensionLog } from "../logger.ts";
import { ITEM_HISTORY_CAPTURE } from "./item-history.const.ts";
import type { ItemHistoryCleanup } from "./item-history.types.ts";
import { readHistoryVisit, resolveHistoryScope } from "./quick-info.ts";
import { observeQuickInfo } from "./quick-info-observer.ts";

const managers = new WeakMap<Document, ItemHistoryCleanup>();

export function startItemHistoryManager(doc: Document): ItemHistoryCleanup {
  let cleanup = managers.get(doc);
  if (!cleanup) {
    let lastSnapshot: string | undefined;
    let stopped = false;

    function capture(): void {
      if (!stopped) {
        try {
          const visit = readHistoryVisit(doc);
          if (visit) {
            const scope = resolveHistoryScope(doc);
            const snapshot = JSON.stringify({ scope, visit });
            if (snapshot !== lastSnapshot) {
              lastSnapshot = snapshot;
              void requestHistoryChange(scope, { action: "visit", visit }).catch((error: unknown) => {
                if (lastSnapshot === snapshot) {
                  lastSnapshot = undefined;
                }
                extensionLog.error("Item history: visit writer failed", error);
              });
            }
          }
        } catch (error) {
          extensionLog.error("Item history: capture failed", error);
        }
      }
    }

    const stopObserver = observeQuickInfo(doc, capture);
    function stopManager(): void {
      if (!stopped) {
        stopped = true;
        stopObserver();
        doc.defaultView?.removeEventListener(ITEM_HISTORY_CAPTURE.PAGE_HIDE_EVENT, stopManager);
        managers.delete(doc);
      }
    }
    cleanup = stopManager;
    managers.set(doc, cleanup);
    doc.defaultView?.addEventListener(ITEM_HISTORY_CAPTURE.PAGE_HIDE_EVENT, cleanup);
  }
  return cleanup;
}