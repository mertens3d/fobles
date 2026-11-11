import { normalizeStructuralCommand, structuralScopeMatches } from "../../shared/structural/structural-command.ts";
import type { StructuralCommandResponse } from "../../shared/structural/structural-command.types.ts";
import { STRUCTURAL_COMMAND } from "../../shared/structural/structural.const.ts";
import type { StructuralCommandDependencies } from "./shell.types";

export function createStructuralCommandHandler(deps: StructuralCommandDependencies) {
  return function handle(message: unknown, sender: chrome.runtime.MessageSender, respond: (response: StructuralCommandResponse) => void): boolean {
    const handles = typeof message === "object" && message !== null && "type" in message &&
      (message.type === STRUCTURAL_COMMAND.PROBE_MESSAGE || message.type === STRUCTURAL_COMMAND.EXECUTE_MESSAGE);
    if (handles) {
      void (async (): Promise<StructuralCommandResponse> => {
        if (sender.id !== chrome.runtime.id || sender.tab ||
          (sender.url !== undefined && sender.url !== chrome.runtime.getURL(STRUCTURAL_COMMAND.BACKGROUND_SCRIPT))) {
          throw new TypeError("Structural content commands require background delegation");
        }
        const command = normalizeStructuralCommand(message);
        if (!structuralScopeMatches(deps.currentScope(), command.scope)) {
          throw new TypeError("Structural command does not match the current verified origin/database");
        }
        const scheduled = message.type === STRUCTURAL_COMMAND.PROBE_MESSAGE ? 0 : await deps.execute(command.action, command.scope);
        return { ok: true, scope: command.scope, scheduled };
      })().then(respond, (error: unknown) => respond({ ok: false, error: error instanceof Error ? error.message : "Structural content command failed" }));
    }
    return handles;
  };
}