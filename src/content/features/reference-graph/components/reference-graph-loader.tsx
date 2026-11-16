// @source-path [fobles] src/content/features/reference-graph/components/reference-graph-loader.tsx

import { useSyncExternalStore } from "react";
import { WorkProgressFooter } from "../../../shared/ui/reference-controls/work-progress-footer";
import { ReferenceGraphApp } from "../reference-graph-app";
import type { ReferenceGraphLoaderProps } from "./components.types";

export function ReferenceGraphLoader({ doc, workSession, loading, harvestForLink }: ReferenceGraphLoaderProps) {
  const state = useSyncExternalStore(loading.subscribe, loading.getState);
  return state.status === "ready" ? (
    <ReferenceGraphApp
      doc={doc}
      workSession={workSession}
      initialPreparedGraph={state.prepared}
      harvestForLink={harvestForLink}
    />
  ) : (
    <div className="fobles-reference-graph-app fobles-reference-graph-loading" data-status={state.status}>
      <div className="fobles-reference-graph-toolbar">
        <WorkProgressFooter workSessionId={workSession.id} />
      </div>
      {state.status === "failed" ? (
        <div className="fobles-reference-graph-loading-message" role="alert">
          {state.message}
        </div>
      ) : null}
    </div>
  );
}
