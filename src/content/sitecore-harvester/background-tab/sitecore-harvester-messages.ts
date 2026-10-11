// @source-path [fobles] src/content/sitecore-harvester/sitecore-harvester-messages.ts

import type { HarvestSitecoreMessage, SitecoreHarvestProgressMessage } from "./sitecore-harvester.messages";
import { harvestSitecore } from "../harvest-sitecore";
import { extensionLog } from "../../logger";
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

            void chrome.runtime.sendMessage({
                type: "SITECORE_HARVEST_PROGRESS",
                requestId: message.requestId,
                originTabId: message.originTabId,
                stepKey: "fetch-document",
                label: "Fetching Document",
                status: "complete",
            } satisfies SitecoreHarvestProgressMessage);

            void chrome.runtime.sendMessage({
                type: "SITECORE_HARVEST_PROGRESS",
                requestId: message.requestId,
                originTabId: message.originTabId,
                stepKey: "parse-document",
                label: "Parsing Document",
                status: "complete",
            } satisfies SitecoreHarvestProgressMessage);


            void harvestSitecore(
                document,
                controller.signal,
                message.filters,
                (step, status) => {
                    void chrome.runtime.sendMessage({
                        type: "SITECORE_HARVEST_PROGRESS",
                        requestId: message.requestId,
                        originTabId: message.originTabId,
                        stepKey: step.stepKey,
                        label: step.label,
                        status,
                    } satisfies SitecoreHarvestProgressMessage);
                },
            ).then((result) => {
                extensionLog.debug("HARVEST HANDLER RESULT", result);
                sendResponse(result);
            });

            return true;
        },
    );

    extensionLog.debug("SENDING SITECORE_HARVESTER_READY", window.top === window);

    void chrome.runtime.sendMessage({
        type: "SITECORE_HARVESTER_READY",
    });
}