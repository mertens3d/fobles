// @source-path [fobles] src/content/toolbar/toolbar-root.tsx

import { ToolbarApp } from "./toolbar-app";
import { useToolbarState } from "./toolbar-store";

export function ToolbarRoot({ doc }: { doc: Document }) {
  const state = useToolbarState(doc);
  if (!state.visible) {
    return null;
  }
  return <ToolbarApp context={state.context} />;
}
