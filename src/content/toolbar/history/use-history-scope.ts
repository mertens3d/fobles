// @source-path [fobles] src/content/toolbar/history/use-history-scope.ts

import { useEffect, useState } from "react";
import { watchSitecoreDocument } from "../../foundation/sitecore/watchers/sitecore-dom-watcher.ts";
import type { SitecoreDocumentEvent } from "../../foundation/sitecore/watchers/watchers.types.ts";
import { historyErrorMessage } from "./handlers.ts";
import type { HistoryScopeState } from "./history.types.ts";

export function useHistoryScope(doc: Document): HistoryScopeState {
  const [state, setState] = useState<HistoryScopeState>({ doc, error: null, scope: null });

  useEffect(() => watchSitecoreDocument(doc, ({ snapshot: active }: SitecoreDocumentEvent) => {
    const scope = active.scope;
    if (scope) {
      setState((current) => current.doc === doc && current.scope?.origin === scope.origin &&
        current.scope.database === scope.database && !current.error ? current : { doc, error: null, scope });
    } else {
      setState({ doc, error: historyErrorMessage(active.scopeError), scope: null });
    }
  }), [doc]);

  return state.doc === doc ? state : { doc, error: null, scope: null };
}