// @source-path [fobles] src/content/features/reference-graph/reference-graph-loading.ts

import type { ReferenceGraphLoading, ReferenceGraphLoadingState } from "./reference-graph.types";

// Agent: The Graph window opens straight away (like the Auditor) and renders from this store: progress while the
// Agent: Reference Model is acquired, then the graph, or the failure message. The first settled state wins.
export function createReferenceGraphLoading(): ReferenceGraphLoading {
  const listeners = new Set<() => void>();
  let state: ReferenceGraphLoadingState = { status: "loading" };

  function settle(next: ReferenceGraphLoadingState): void {
    if (state.status === "loading") {
      state = next;
      listeners.forEach((listener) => listener());
    }
  }

  return {
    getState: () => state,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    resolve: (prepared) => settle({ status: "ready", prepared }),
    fail: (message) => settle({ status: "failed", message }),
  };
}
