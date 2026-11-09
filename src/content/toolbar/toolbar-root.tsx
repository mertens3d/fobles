// @source-path [fobles] src/content/toolbar/toolbar-root.tsx

import { Fragment } from "react";
import { FoblesUtilityWindows } from "../shell/utility/fobles-utility-windows";
import { WorkerIframeWindow } from "../shell/worker-iframes/worker-iframe-window";
import { WorkerTaskManagerWindow } from "./diagnostics/worker-task-manager-window";
import { ToolbarApp } from "./toolbar-app";
import { useToolbarState } from "./toolbar-store";

export function ToolbarRoot({ doc }: { doc: Document }) {
  const state = useToolbarState(doc);
  return <Fragment>
    {state.visible ? <ToolbarApp context={state.context} /> : null}
    <FoblesUtilityWindows doc={doc} />
    <WorkerTaskManagerWindow />
    <WorkerIframeWindow />
  </Fragment>;
}
