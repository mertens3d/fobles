// @source-path [fobles] src/content/toolbar/history/use-history-icons.ts
import { useEffect, useState } from "react";
import { getCachedFact } from "../../foundation/cache/sitecore-data/sitecore-data-cache.ts";
import { subscribeFactUpdated } from "../../foundation/cache/sitecore-data/sitecore-data-events.ts";
import type { SitecoreDataCacheKey } from "../../foundation/cache/sitecore-data/sitecore-data.types";
import type { HistoryItem, HistoryScope } from "../../../shared/item-history/item-history.types.ts";

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
    const read = (): void => {
      void getCachedFact(key, "quickInfo").then((fact) => {
        if (active) {
          setIcon(fact?.value.result.status === "found" ? fact.value.result.value?.scItemIcon : undefined);
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
