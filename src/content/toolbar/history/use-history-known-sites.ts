import { useEffect, useState } from "react";
import type { HistoryScope } from "../../../shared/item-history/item-history.types.ts";
import { readKnownSites, subscribeKnownSites } from "../../../shared/known-sites/known-sites-repository.ts";
import type { KnownSite } from "../../../shared/structural/structural.types.ts";
import type { HistoryKnownSitesSnapshot } from "./history.types.ts";

export function useHistoryKnownSites(scope: HistoryScope | null): readonly KnownSite[] {
  const [snapshot, setSnapshot] = useState<HistoryKnownSitesSnapshot>({ scope: null, sites: [] });

  useEffect(() => {
    let active = true;
    let revision = 0;
    let unsubscribe: (() => void) | undefined;
    setSnapshot({ scope, sites: [] });

    function publish(sites: KnownSite[]): void {
      if (active && scope) {
        setSnapshot({ scope, sites });
      }
    }

    if (scope) {
      try {
        unsubscribe = subscribeKnownSites(scope, (sites) => {
          revision += 1;
          publish(sites);
        });
        const initialRevision = revision;
        void readKnownSites(scope).then((sites) => {
          if (active && revision === initialRevision) {
            publish(sites);
          }
        }).catch(() => {
          if (active && revision === initialRevision) {
            setSnapshot({ scope, sites: [] });
          }
        });
      } catch {
        setSnapshot({ scope, sites: [] });
      }
    }
    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [scope]);

  return snapshot.scope === scope ? snapshot.sites : [];
}