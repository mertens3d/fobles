// @source-path [fobles] src/content/sitecore-harvester/background-tab/sitecore-background-tab-harvester.ts

import type { HarvestSitecoreMessage } from "./sitecore-harvester.messages";
import type { SitecoreHarvestResult, BackgroundHarvestContext, HarvestProgressStatus, StepKey } from "../sitecore-harvester.types";
import { extensionLog } from "../../logger";
import { CONST } from "../../../constants/const";

async function sendHarvestMessage(
    tabId: number,
    message: HarvestSitecoreMessage,
): Promise<SitecoreHarvestResult | undefined> {
    let result: SitecoreHarvestResult | undefined;
    let attempt = 0;
    const maxAttempts = 50;
    while (attempt < maxAttempts) {
        attempt++;

        try {
            extensionLog.debug("HARVEST SEND ATTEMPT", { tabId, attempt });

            result = await chrome.tabs.sendMessage<
                HarvestSitecoreMessage,
                SitecoreHarvestResult | undefined
            >(
                tabId,
                message,
                { frameId: 0 },
            );

            extensionLog.debug("HARVEST SEND SUCCESS", {
                tabId,
                attempt,
                hasResult: result !== undefined,
            });

            break;
        } catch (error) {
            extensionLog.debug("HARVEST SEND FAILURE", {
                tabId,
                attempt,
                error,
            });

            if (
                !(error instanceof Error) ||
                !error.message.includes("Receiving end does not exist")
            ) {
                throw error;
            }

            await new Promise((resolve) => setTimeout(resolve, 50));
        }
    }

    extensionLog.debug("HARVEST SEND WAITING FOR RESPONSE", {
        tabId,
        attempt,
    });

    extensionLog.debug("HARVEST SEND RESPONSE RECEIVED", {
        tabId,
        attempt,
        hasResult: Boolean(result),
    });

    if (attempt >= maxAttempts) {
        extensionLog.debug("HARVEST SEND MAX ATTEMPTS REACHED", { tabId, maxAttempts, hasResult: result !== undefined });
    }
    return result;
}

export async function harvestSitecoreInBackgroundTab(
    backgroundHarvestContext: BackgroundHarvestContext
): Promise<SitecoreHarvestResult | undefined> {
    const tab = await chrome.tabs.create({
        active: CONST.FOBLES.REFERENCE_GRAPH. DEBUG_BACKGROUND_HARVEST,
    });

    if (tab.id === undefined) {
        return undefined;
    }

    const tabId = tab.id;

    try {
        await reportProgress(
            backgroundHarvestContext,
            "fetch-document",
            "Fetching Document",
            "active",
        );

        await chrome.tabs.update(tabId, {
            url: backgroundHarvestContext.url,
        });

        const message: HarvestSitecoreMessage = {
            type: "HARVEST_SITECORE",
            requestId: backgroundHarvestContext.requestId,
            originTabId: backgroundHarvestContext.originTabId,
            filters: backgroundHarvestContext.filters,
        };

        const result = await sendHarvestMessage(tabId, message);

        await reportProgress(
            backgroundHarvestContext,
            "fetch-document",
            "Fetching Document",
            "complete",
        );

        return result;
    } finally {
        if (!CONST.FOBLES.REFERENCE_GRAPH. DEBUG_BACKGROUND_HARVEST) {
            await chrome.tabs.remove(tabId);
        }
    }
}

async function reportProgress(
    context: BackgroundHarvestContext,
    stepKey: StepKey,
    label: string,
    status: HarvestProgressStatus,
): Promise<void> {
    await chrome.tabs.sendMessage(context.originTabId, {
        type: "SITECORE_HARVEST_PROGRESS",
        requestId: context.requestId,
        stepKey,
        label,
        status,
    });
}