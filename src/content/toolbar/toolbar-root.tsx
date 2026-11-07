// @source-path [fobles] src/content/toolbar/toolbar-root.tsx

import { Fragment } from "react";
import { WorkerTaskManagerWindow } from "./diagnostics/worker-task-manager-window";
import { ToolbarApp } from "./toolbar-app";
import { useToolbarState } from "./toolbar-store";

export function ToolbarRoot({ doc }: { doc: Document }) {
  const state = useToolbarState(doc);
  if (!state.visible) {
    return null;
  }
  return <Fragment>
    <ToolbarApp context={state.context} />
    <WorkerTaskManagerWindow />
  </Fragment>;
}
