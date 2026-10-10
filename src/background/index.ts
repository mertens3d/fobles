// @source-path [fobles] src/background/index.ts

/// <reference types="chrome" />

import { LOGGER, MESSAGE } from "../constants/constants-b";
import { harvestSitecoreInBackgroundTab } from "../content/sitecore-harvester/sitecore-background-tab-harvester";
import type { HarvestSitecoreInBackgroundTabMessage, SitecoreHarvestProgressMessage } from "../content/sitecore-harvester/sitecore-harvester.messages";

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

type RuntimeMessage = RuntimeReloadMessage | HarvestSitecoreInBackgroundTabMessage | SitecoreHarvestProgressMessage;;

interface RuntimeReloadMessage {
  action: string;
}

chrome.runtime.onMessage.addListener(
  (request: RuntimeMessage, sender, sendResponse) => {
    if ("action" in request && request.action === MESSAGE.ACTION.RELOAD_EXTENSION) {
      if (sender.tab?.id !== undefined) {
        void chrome.tabs?.reload?.(sender.tab.id);
      }

      chrome.runtime?.reload?.();
      return;
    }
    
    if (
      "type" in request &&
      request.type === "SITECORE_HARVEST_PROGRESS"
    ) {
      void chrome.tabs.sendMessage(
        request.originTabId,
        request,
        {
          frameId: 0,
        },
      );

      return;
    }

    if (
      "type" in request &&
      request.type === "HARVEST_SITECORE_IN_BACKGROUND_TAB"
    ) {
      const originTabId = sender.tab?.id;

      if (originTabId === undefined) {
        sendResponse(undefined);
        return;
      }

      const backgroundHarvestContext = {
        url: request.url,
        filters: request.filters,
        requestId: request.requestId,
        originTabId,
      };

      void harvestSitecoreInBackgroundTab(
        backgroundHarvestContext
      ).then(sendResponse);

      return true;
    }
  },
);

console.log(LOGGER.NAMESPACE, "Background script loaded");
