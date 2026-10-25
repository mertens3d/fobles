// @source-path [fobles] src/content/features/reference-graph/reference-graph-shell-commands.ts

import { subscribeFoblesShellCommand } from "../../shell/shell-events";
import { openReferenceGraph } from "./reference-graph";

export function registerReferenceGraphShellCommands(): () => void {
  return subscribeFoblesShellCommand("reference-graph:open", ({ doc }) => {
    void openReferenceGraph(doc);
  });
}
