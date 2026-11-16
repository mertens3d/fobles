// @source-path [fobles] src/content/item-history/item-history-manager.ts

import { requestHistoryChange } from "../../shared/item-history/item-history-client.ts";
import type { HistoryScope, HistoryVisit } from "../../shared/item-history/item-history.types.ts";
import type { SitecoreDataCacheKey } from "../foundation/cache/sitecore-data/sitecore-data.types";
import { resolveHistoryScope } from "../foundation/sitecore/watchers/active-item-reader.ts";
import { watchSitecoreDocument } from "../foundation/sitecore/watchers/sitecore-dom-watcher.ts";
import { SITECORE_DOM_WATCHER } from "../foundation/sitecore/watchers/watchers.const.ts";
import type { SitecoreDocumentEvent } from "../foundation/sitecore/watchers/watchers.types.ts";
import { runWorkerTask } from "../foundation/workers/pool/worker-pool-client.ts";
import { createErrorResult } from "../foundation/workers/tasks/worker-task.ts";
import type { WorkerTask } from "../foundation/workers/tasks/tasks.types";
import { WORK_SCHEDULING } from "../foundation/workers/work-scheduling.const.ts";
import { extensionLog } from "../logger.ts";
import type { ItemHistoryCleanup } from "./item-history.types.ts";
import { requestFact } from "../foundation/sitecore/data/sitecore-data-service.ts";

const managers = new WeakMap<Document, ItemHistoryCleanup>();

function scheduleDiscovery(doc: Document, scope: HistoryScope, visit: HistoryVisit, isStopped: () => boolean): void {
  void import("../foundation/reference-data/processing/item-kind/structural-discovery.ts").then(({ scheduleStructuralDiscovery }) => {
    const currentScope = resolveHistoryScope(doc);
    if (!isStopped() && currentScope.origin === scope.origin && currentScope.database === scope.database) {
      scheduleStructuralDiscovery(scope, [visit]);
    }
  }).catch((error: unknown) => {
    extensionLog.warn("Item history: structural discovery failed", { error });
  });
}

function prefetchQuickInfo(doc: Document, scope: HistoryScope, visit: HistoryVisit): void {
  const key: SitecoreDataCacheKey = { environment: scope.origin, database: scope.database, language: "en", item: { kind: "id", value: visit.id } };
  const task: WorkerTask = { requestId: `history:${visit.id}`, taskId: crypto.randomUUID(), type: "get-quick-info", url: doc.location.href, requested: key.item, workClass: WORK_SCHEDULING.BACKGROUND };
  void requestFact(key, "quickInfo", async () => (await runWorkerTask(task)) ?? createErrorResult(task, "No response from worker pool"), { requestId: task.requestId, visible: false }).catch((error: unknown) => {
    extensionLog.warn("Item history: quick info prefetch failed", { error });
  });
}

export function startItemHistoryManager(doc: Document): ItemHistoryCleanup {
  let cleanup = managers.get(doc);
  if (!cleanup) {
    let lastSnapshot: string | undefined;
    let stopped = false;
    const isStopped = (): boolean => stopped;

    function recordVisit(scope: HistoryScope, visit: HistoryVisit, snapshot: string): void {
      void requestHistoryChange(scope, { action: "visit", visit }).catch((error: unknown) => {
        if (lastSnapshot === snapshot) {
          lastSnapshot = undefined;
        }
        extensionLog.error("Item history: visit writer failed", error);
      });
    }

    function captureVisit(scope: HistoryScope, visit: HistoryVisit): void {
      const snapshot = JSON.stringify({ scope, visit });
      if (snapshot !== lastSnapshot) {
        lastSnapshot = snapshot;
        scheduleDiscovery(doc, scope, visit, isStopped);
        prefetchQuickInfo(doc, scope, visit);
        recordVisit(scope, visit, snapshot);
      }
    }

    function capture(event: SitecoreDocumentEvent): void {
      const active = event.snapshot;
      if (!stopped && event.type === SITECORE_DOM_WATCHER.EVENT.CHANGE && active.visit) {
        try {
          if (!active.scope) {
            throw active.scopeError;
          }
          captureVisit(active.scope, active.visit);
        } catch (error) {
          extensionLog.error("Item history: capture failed", error);
        }
      }
    }

    const stopWatching = watchSitecoreDocument(doc, capture);
    function stopManager(): void {
      if (!stopped) {
        stopped = true;
        stopWatching();
        doc.defaultView?.removeEventListener(SITECORE_DOM_WATCHER.PAGE_HIDE_EVENT, stopManager);
        managers.delete(doc);
      }
    }
    cleanup = stopManager;
    managers.set(doc, cleanup);
    doc.defaultView?.addEventListener(SITECORE_DOM_WATCHER.PAGE_HIDE_EVENT, cleanup);
  }
  return cleanup;
}