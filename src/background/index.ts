// @source-path [fobles] src/background/index.ts

/// <reference types="chrome" />

import { LOGGER, MESSAGE } from "../constants/constants-b";
import { REFERENCE_GRAPH } from "../constants/graph.const";
import { extensionLog } from "../content/logger";
import { harvestSitecoreInBackgroundTab } from "../content/sitecore-harvester/background-tab/sitecore-background-tab-harvester";
import type { HarvestSitecoreInBackgroundTabMessage, SitecoreHarvestProgressMessage } from "../content/sitecore-harvester/background-tab/sitecore-harvester.messages";
import { appendPersistedLogEntry } from "../shared/logging/persisted-log-storage";
import type { PersistedLogMessage } from "../shared/persisted-log.types";

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

type RuntimeMessage = RuntimeReloadMessage | HarvestSitecoreInBackgroundTabMessage | SitecoreHarvestProgressMessage | PersistedLogMessage;

interface RuntimeReloadMessage {
  action: string;
}
chrome.runtime.onMessage.addListener(
  (request: RuntimeMessage, sender, sendResponse) => {
    if (
      "type" in request &&
      request.type ===
        REFERENCE_GRAPH.BACKGROUND_HARVEST.MESSAGE.TYPE.FOBLES_PERSIST_LOG
    ) {
      void appendPersistedLogEntry(request.entry).catch((error) => {
        extensionLog.error(
          LOGGER.NAMESPACE,
          "Failed to persist log entry",
          error,
        );
      });

      return;
    }

    if (
      "action" in request &&
      request.action === MESSAGE.ACTION.RELOAD_EXTENSION
    ) {
      if (sender.tab?.id !== undefined) {
        void chrome.tabs?.reload?.(sender.tab.id);
      }

      chrome.runtime?.reload?.();
      return;
    }

    if (
      "type" in request &&
      request.type ===
        REFERENCE_GRAPH.BACKGROUND_HARVEST.MESSAGE.TYPE
          .SITECORE_HARVEST_PROGRESS
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
      request.type ===
        REFERENCE_GRAPH.BACKGROUND_HARVEST.MESSAGE.TYPE
          .HARVEST_SITECORE_IN_BACKGROUND_TAB
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
        backgroundHarvestContext,
      )
        .then((result) => {
          extensionLog.debug(
            LOGGER.NAMESPACE,
            "BACKGROUND GOT HARVEST RESULT",
            result,
          );

          sendResponse(result);
        })
        .catch((error) => {
          extensionLog.error(
            LOGGER.NAMESPACE,
            "Background Sitecore harvest failed",
            error,
          );

          sendResponse(undefined);
        });

      return true;
    }
  },
);
extensionLog.debug(LOGGER.NAMESPACE, "Background script loaded");
