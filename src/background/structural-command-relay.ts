import { normalizeHistoryScope } from "../shared/item-history/item-history-model.ts";
import { normalizeStructuralCommand, requireStructuralResponse } from "../shared/structural/structural-command.ts";
import { STRUCTURAL_COMMAND } from "../shared/structural/structural.const.ts";
import type { StructuralRelayDependencies } from "../shared/structural/structural-command.types.ts";

export async function relayStructuralCommand(value: unknown, sender: chrome.runtime.MessageSender, deps: StructuralRelayDependencies) {
  if (sender.id !== chrome.runtime.id || sender.url !== chrome.runtime.getURL(STRUCTURAL_COMMAND.OPTIONS_PAGE) || sender.tab) {
    throw new TypeError("Structural commands require the trusted Options page");
  }
  const command = normalizeStructuralCommand(value);
  const tabs = (await deps.queryTabs()).filter((tab) => {
    let matches: boolean;
    try {
      matches = tab.id !== undefined && normalizeHistoryScope({ origin: tab.url, database: command.scope.database }).origin === command.scope.origin;
    } catch {
      matches = false;
    }
    return matches;
  }).sort((a, b) => Number(Boolean(b.active)) - Number(Boolean(a.active)) || (b.lastAccessed ?? 0) - (a.lastAccessed ?? 0));
  let target: number | undefined;
  for (const tab of tabs) {
    if (target === undefined && tab.id !== undefined) {
      try {
        requireStructuralResponse(await deps.send(tab.id, { type: STRUCTURAL_COMMAND.PROBE_MESSAGE, ...command }), command.scope);
        target = tab.id;
      } catch {
        continue;
      }
    }
  }
  if (target === undefined) {
    throw new Error("Open a Content Editor tab with a verified matching origin/database, then retry.");
  }
  return requireStructuralResponse(await deps.send(target, { type: STRUCTURAL_COMMAND.EXECUTE_MESSAGE, ...command }), command.scope);
}