/// <reference types="chrome" />

import { LOGGER, MESSAGE } from "../shared/constants";

chrome.commands?.onCommand?.addListener((command: string) => {
  if (command === MESSAGE.ACTION.TOGGLE_FOBLES) {
    chrome.tabs?.query(
      { active: true, currentWindow: true },
      (tabs: Array<{ id?: number }>) => {
        const activeTab = tabs[0];
        if (activeTab?.id !== undefined) {
          chrome.tabs?.sendMessage(activeTab.id, {
            action: MESSAGE.ACTION.TOGGLE_FOBLES,
          });
        }
      },
    );
  }
});

chrome.runtime?.onMessage?.addListener((request, sender) => {
  if (request.action === MESSAGE.ACTION.RELOAD_EXTENSION) {
    // Reloading the extension alone doesn't refresh already-open tabs' content scripts.
    if (sender.tab?.id !== undefined) chrome.tabs?.reload?.(sender.tab.id);
    chrome.runtime?.reload?.();
  }
});

console.log(LOGGER.NAMESPACE, "Background script loaded");
