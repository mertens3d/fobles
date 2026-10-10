import type { HarvestSitecoreMessage } from "./sitecore-harvester.messages";
import type { SitecoreHarvestResult, BackgroundHarvestContext } from "./sitecore-harvester.types";

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
            console.log("HARVEST SEND ATTEMPT", { tabId, attempt });

            result = await chrome.tabs.sendMessage<
                HarvestSitecoreMessage,
                SitecoreHarvestResult | undefined
            >(tabId, message, { frameId: 0 });

            console.log("HARVEST SEND SUCCESS", {
                tabId,
                attempt,
                hasResult: result !== undefined,
            });

            break;
        } catch (error) {
            console.log("HARVEST SEND FAILURE", {
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
    if (attempt >= maxAttempts) {
        console.log("HARVEST SEND MAX ATTEMPTS REACHED", { tabId, maxAttempts, hasResult: result !== undefined });
    }
    return result;
}

export async function harvestSitecoreInBackgroundTab(
    backgroundHarvestContext: BackgroundHarvestContext
): Promise<SitecoreHarvestResult | undefined> {
    const tab = await chrome.tabs.create({
        active: false,
    });

    if (tab.id === undefined) {
        return undefined;
    }

    const tabId = tab.id;

    try {
        await chrome.tabs.update(tabId, { url: backgroundHarvestContext.url });

        const message: HarvestSitecoreMessage = {
            type: "HARVEST_SITECORE",
            requestId: backgroundHarvestContext.requestId,
            originTabId: backgroundHarvestContext.originTabId,
            filters: backgroundHarvestContext.filters,
        };

        return await sendHarvestMessage(tabId, message);
    } finally {
        await chrome.tabs.remove(tabId);
    }
}
