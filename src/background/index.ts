/// <reference types="chrome" />

import { LOGGER, MESSAGE } from "../constants/constants-b";

const RELAYED_COMMANDS: readonly string[] = [
  MESSAGE.ACTION.TOGGLE_FOBLES,
  MESSAGE.ACTION.TOGGLE_LBOLT,
];

chrome.commands?.onCommand?.addListener((command: string) => {
  if (!RELAYED_COMMANDS.includes(command)) return;

  chrome.tabs?.query(
    { active: true, currentWindow: true },
    (tabs: Array<{ id?: number }>) => {
      const activeTab = tabs[0];
      if (activeTab?.id !== undefined) {
        void chrome.tabs?.sendMessage(activeTab.id, { action: command });
      }
    },
  );
});

interface RuntimeMessage {
  action: string;
}

chrome.runtime?.onMessage?.addListener((request: RuntimeMessage, sender) => {
  if (request.action === MESSAGE.ACTION.RELOAD_EXTENSION) {
    // Reloading the extension alone doesn't refresh already-open tabs' content scripts.
    if (sender.tab?.id !== undefined) {
      void chrome.tabs?.reload?.(sender.tab.id);
    }
    chrome.runtime?.reload?.();
  }
});

console.log(LOGGER.NAMESPACE, "Background script loaded");
