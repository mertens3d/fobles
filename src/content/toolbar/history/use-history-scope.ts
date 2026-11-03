// @source-path [fobles] src/content/toolbar/history/use-history-scope.ts

import { useEffect, useState } from "react";
import { observeQuickInfo } from "../../item-history/quick-info-observer.ts";
import { resolveHistoryScope } from "../../item-history/quick-info.ts";
import { historyErrorMessage } from "./handlers.ts";
import type { HistoryScopeState } from "./history.types.ts";

export function useHistoryScope(doc: Document): HistoryScopeState {
  const [state, setState] = useState<HistoryScopeState>({ doc, error: null, scope: null });

  useEffect(() => observeQuickInfo(doc, () => {
    try {
      const scope = resolveHistoryScope(doc);
      setState((current) => current.doc === doc && current.scope?.origin === scope.origin &&
        current.scope.database === scope.database && !current.error ? current : { doc, error: null, scope });
    } catch (error) {
      setState({ doc, error: historyErrorMessage(error), scope: null });
    }
  }), [doc]);

  return state.doc === doc ? state : { doc, error: null, scope: null };
}