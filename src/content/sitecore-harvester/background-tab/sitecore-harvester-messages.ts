// @source-path [fobles] src/content/sitecore-harvester/sitecore-harvester-messages.ts

import type {
  HarvestSitecoreMessage,
  SitecoreHarvestProgressMessage,
} from "./sitecore-harvester.messages";
import { harvestSitecore } from "../harvest-sitecore";
import { extensionLog } from "../../logger";
import { REFERENCE_GRAPH } from "../../../constants/graph.const";
export function registerSitecoreHarvesterMessageHandler(): void {
  if (window.top !== window) {
    return;
  }

  chrome.runtime.onMessage.addListener(
    (message: HarvestSitecoreMessage, _sender, sendResponse) => {
      if (message.type !== REFERENCE_GRAPH.BACKGROUND_HARVEST.MESSAGE.TYPE.HARVEST_SITECORE) {
        return;
      }

      const controller = new AbortController();

      void chrome.runtime.sendMessage({
        type: REFERENCE_GRAPH.BACKGROUND_HARVEST.MESSAGE.TYPE.SITECORE_HARVEST_PROGRESS,
        requestId: message.requestId,
        originTabId: message.originTabId,
        stepKey: "fetch-document",
        label: "Fetching Document",
        status: "complete",
      } satisfies SitecoreHarvestProgressMessage);

      void chrome.runtime.sendMessage({
        type: REFERENCE_GRAPH.BACKGROUND_HARVEST.MESSAGE.TYPE.SITECORE_HARVEST_PROGRESS,
        requestId: message.requestId,
        originTabId: message.originTabId,
        stepKey: "parse-document",
        label: "Parsing Document",
        status: "complete",
      } satisfies SitecoreHarvestProgressMessage);

      extensionLog.debug("HARVEST HANDLER START", {
        requestId: message.requestId,
        url: document.URL,
      });

      void harvestSitecore(
        document,
        controller.signal,
        message.filters,
        (step, status) => {
          extensionLog.debug(`HARVEST STEP: ${step.stepKey}`, {
            requestId: message.requestId,
            stepKey: step.stepKey,
            status,
          });

          void chrome.runtime.sendMessage({
            type: REFERENCE_GRAPH.BACKGROUND_HARVEST.MESSAGE.TYPE.SITECORE_HARVEST_PROGRESS,
            requestId: message.requestId,
            originTabId: message.originTabId,
            stepKey: step.stepKey,
            label: step.label,
            status,
          } satisfies SitecoreHarvestProgressMessage);
        },
      )
        .then((result) => {
          extensionLog.debug("HARVEST HANDLER SUCCESS", {
            requestId: message.requestId,
            hasResult: Boolean(result),
          });

          sendResponse(result);
        })
        .catch((error: unknown) => {
          extensionLog.error("HARVEST HANDLER FAILED", {
            requestId: message.requestId,
            error,
          });

          sendResponse(undefined);
        })
        .finally(() => {
          extensionLog.debug("HARVEST HANDLER SETTLED", {
            requestId: message.requestId,
          });
        });

      return true;
    },
  );

  extensionLog.debug(`SENDING ${REFERENCE_GRAPH.BACKGROUND_HARVEST.MESSAGE.TYPE.SITECORE_HARVESTER_READY}`, window.top === window);

  void chrome.runtime.sendMessage({
    type:  REFERENCE_GRAPH.BACKGROUND_HARVEST.MESSAGE.TYPE.SITECORE_HARVESTER_READY,
  });
}
