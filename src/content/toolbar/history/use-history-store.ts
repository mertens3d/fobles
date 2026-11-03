// @source-path [fobles] src/content/toolbar/history/use-history-store.ts

import { useCallback, useEffect, useRef, useState } from "react";
import { requestHistoryChange } from "../../../shared/item-history/item-history-client.ts";
import { getHistory, subscribeHistory } from "../../../shared/item-history/item-history-repository.ts";
import type { HistoryScope } from "../../../shared/item-history/item-history.types.ts";
import { historyErrorMessage } from "./handlers.ts";
import type { HistoryMutation, HistorySnapshot, HistoryStore } from "./history.types.ts";

export function useHistoryStore(scope: HistoryScope | null): HistoryStore {
  const [snapshot, setSnapshot] = useState<HistorySnapshot>({ error: null, items: [], scope: null });
  const generation = useRef(0);
  const mounted = useRef(false);
  const currentScope = useRef(scope);
  currentScope.current = scope;

  useEffect(() => {
    let active = true;
    let revision = 0;
    let unsubscribe: (() => void) | undefined;
    mounted.current = true;
    generation.current += 1;
    setSnapshot({ error: null, items: [], scope });
    if (scope) {
      try {
        unsubscribe = subscribeHistory(scope, (items) => {
          revision += 1;
          if (active) {
            setSnapshot({ error: null, items, scope });
          }
        });
        const initialRevision = revision;
        void getHistory(scope).then((items) => {
          if (active && revision === initialRevision) {
            setSnapshot({ error: null, items, scope });
          }
        }).catch((error: unknown) => {
          if (active && revision === initialRevision) {
            setSnapshot({ error: historyErrorMessage(error), items: [], scope });
          }
        });
      } catch (error) {
        setSnapshot({ error: historyErrorMessage(error), items: [], scope });
      }
    }
    return () => {
      active = false;
      mounted.current = false;
      generation.current += 1;
      unsubscribe?.();
    };
  }, [scope]);

  const reportError = useCallback((error: unknown) => {
    if (mounted.current && scope === currentScope.current) {
      setSnapshot((current) => ({ ...current, error: historyErrorMessage(error), scope }));
    }
  }, [scope]);

  const mutate = useCallback(async (change: HistoryMutation): Promise<void> => {
    const started = generation.current;
    if (scope) {
      try {
        await requestHistoryChange(scope, change);
      } catch (error) {
        if (generation.current === started) {
          reportError(error);
        }
      }
    }
  }, [reportError, scope]);

  const current = snapshot.scope === scope ? snapshot : { error: null, items: [], scope };
  return { ...current, mutate, reportError };
}