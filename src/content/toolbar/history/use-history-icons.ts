// @source-path [fobles] src/content/toolbar/history/use-history-icons.ts

import { useEffect, useState } from "react";
import { subscribeFactUpdated } from "../../foundation/cache/sitecore-data/sitecore-data-events.ts";
import type { SitecoreDataCacheKey } from "../../foundation/cache/sitecore-data/sitecore-data-cache.types.ts";
import { requestFact } from "../../foundation/sitecore/data/sitecore-data-service.ts";
import { runWorkerTask } from "../../foundation/workers/pool/worker-pool-client.ts";
import { createErrorResult, type WorkerTask } from "../../foundation/workers/tasks/worker-task.types.ts";
import { WORK_SCHEDULING } from "../../foundation/workers/work-scheduling.const.ts";
import type { HistoryItem, HistoryScope } from "../../../shared/item-history/item-history.types.ts";
import { buildHistoryUrl } from "./history-navigation.ts";

export function useHistoryIcon(item: HistoryItem, scope: HistoryScope): string | undefined {
  const [icon, setIcon] = useState<string>();

  useEffect(() => {
    let active = true;
    const key: SitecoreDataCacheKey = {
      environment: scope.origin,
      database: scope.database,
      language: "en",
      item: { kind: "id", value: item.id },
    };
    const task: WorkerTask = {
      requestId: `history:${item.id}`,
      taskId: crypto.randomUUID(),
      type: "get-quick-info",
      url: buildHistoryUrl(scope, item.id),
      requested: key.item,
      workClass: WORK_SCHEDULING.BACKGROUND,
    };
    const read = (): void => {
      void requestFact(
        key,
        "quickInfo",
        async () => (await runWorkerTask(task)) ?? createErrorResult(task, "No response from worker pool"),
        { requestId: task.requestId, visible: false },
      ).then((fact) => {
        if (active) {
          setIcon(fact?.result.status === "found" ? fact.result.value?.scItemIcon : undefined);
        }
      });
    };
    const unsubscribe = subscribeFactUpdated(key, "quickInfo", read);
    read();
    return () => {
      active = false;
      unsubscribe();
    };
  }, [item.id, scope.database, scope.origin]);

  return icon;
}
