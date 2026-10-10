// @source-path [fobles] src/content/sitecore-harvester/sitecore-harvester-messages.ts

import type { HarvestSitecoreMessage, SitecoreHarvestProgressMessage } from "./sitecore-harvester.messages";
import { harvestSitecore } from "./harvest-sitecore";
export function registerSitecoreHarvesterMessageHandler(): void {
    if (window.top !== window) {
        return;
    }

    chrome.runtime.onMessage.addListener(
        (message: HarvestSitecoreMessage, _sender, sendResponse) => {
            if (message.type !== "HARVEST_SITECORE") {
                return;
            }

            const controller = new AbortController();

            void harvestSitecore(
                document,
                controller.signal,
                message.filters,
                (step, status) => {
                    void chrome.runtime.sendMessage({
                        type: "SITECORE_HARVEST_PROGRESS",
                        requestId: message.requestId,
                        originTabId: message.originTabId,
                        harvestStepKey: step.harvestStepKey,
                        label: step.label,
                        status,
                    } satisfies SitecoreHarvestProgressMessage);
                },
            ).then((result) => {
                console.log("HARVEST HANDLER RESULT", result);
                sendResponse(result);
            });

            return true;
        },
    );

    console.log("SENDING SITECORE_HARVESTER_READY", window.top === window);

    void chrome.runtime.sendMessage({
        type: "SITECORE_HARVESTER_READY",
    });
}