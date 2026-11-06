import { STRUCTURAL_COMMAND } from "../shared/structural/structural.const.ts";
import type { StructuralCommandResponse } from "../shared/structural/structural-command.types.ts";
import { relayStructuralCommand } from "./structural-command-relay.ts";

function handleStructuralCommand(message: unknown, sender: chrome.runtime.MessageSender, respond: (response: StructuralCommandResponse) => void): boolean {
  const handles = typeof message === "object" && message !== null && "type" in message && message.type === STRUCTURAL_COMMAND.REQUEST_MESSAGE;
  if (handles) {
    void relayStructuralCommand(message, sender, {
      queryTabs: () => chrome.tabs.query({}),
      send: (tabId, request) => chrome.tabs.sendMessage(tabId, request, { frameId: 0 }),
    }).then(respond, (error: unknown) => respond({ ok: false, error: error instanceof Error ? error.message : "Structural command failed" }));
  }
  return handles;
}

chrome.runtime.onMessage.addListener(handleStructuralCommand);