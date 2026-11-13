// @source-path [fobles] src/content/item-history/item-history-manager.ts

import { requestHistoryChange } from "../../shared/item-history/item-history-client.ts";
import type { SitecoreDataCacheKey } from "../foundation/cache/sitecore-data/sitecore-data.types";
import { runWorkerTask } from "../foundation/workers/pool/worker-pool-client.ts";
import { createErrorResult } from "../foundation/workers/tasks/worker-task.ts";
import type { WorkerTask } from "../foundation/workers/tasks/tasks.types";
import { WORK_SCHEDULING } from "../foundation/workers/work-scheduling.const.ts";
import { extensionLog } from "../logger.ts";
import { ITEM_HISTORY_CAPTURE } from "./item-history.const.ts";
import type { ItemHistoryCleanup } from "./item-history.types.ts";
import { readHistoryVisit, resolveHistoryScope } from "./quick-info.ts";
import { observeQuickInfo } from "./quick-info-observer.ts";
import { requestFact } from "../foundation/sitecore/data/sitecore-data-service.ts";

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
              void import("../foundation/reference-data/processing/item-kind/structural-discovery.ts").then(({ scheduleStructuralDiscovery }) => {
                const currentScope = resolveHistoryScope(doc);
                if (!stopped && currentScope.origin === scope.origin && currentScope.database === scope.database) {
                  scheduleStructuralDiscovery(scope, [visit]);
                }
              }).catch((error: unknown) => {
                extensionLog.warn("Item history: structural discovery failed", { error });
              });
              const key: SitecoreDataCacheKey = { environment: scope.origin, database: scope.database, language: "en", item: { kind: "id", value: visit.id } };
              const task: WorkerTask = { requestId: `history:${visit.id}`, taskId: crypto.randomUUID(), type: "get-quick-info", url: doc.location.href, requested: key.item, workClass: WORK_SCHEDULING.BACKGROUND };
              void requestFact(key, "quickInfo", async () => (await runWorkerTask(task)) ?? createErrorResult(task, "No response from worker pool"), { requestId: task.requestId, visible: false }).catch((error: unknown) => {
                extensionLog.warn("Item history: quick info prefetch failed", { error });
              });
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