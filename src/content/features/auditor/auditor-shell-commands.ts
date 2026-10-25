// @source-path [fobles] src/content/features/auditor/auditor-shell-commands.ts

import { subscribeFoblesShellCommand } from "../../shell/shell-events";
import { openAuditor } from "./auditor-command";

export function registerAuditorShellCommands(): () => void {
  return subscribeFoblesShellCommand("auditor:open", ({ doc }) => {
    void openAuditor(doc);
  });
}
