import { extensionLog } from "../../logger";
import { harvestSitecore } from "../../sitecore-harvester/harvest-sitecore";
import type { SitecoreHarvestResult } from "../../sitecore-harvester/sitecore-harvester.types";
import type { SitecoreHarvestFiltersState } from "../../sitecore-harvester/sitecore-harvester.types";
import { handleHarvestProgress } from "./build-progress";

// Left-clicking a graph node re-roots the SAME open modal at that item, with no page navigation
// at all - fetches that item's own content-editor page (same technique resolveRenderingDetails
// already uses) and re-harvests against the fetched document instead of the live one. Raw
// Values/Standard Fields are already confirmed on by the time any node is clickable, so the
// fetched page reflects them too (both are session-level view settings, not per-page).

export async function harvestGraphForLink(link: string, 
  progressDoc: Document,
  referenceGraphAbortController: AbortController | undefined,
  filters: SitecoreHarvestFiltersState,
): Promise<SitecoreHarvestResult | undefined> {
  const controller = new AbortController();
  referenceGraphAbortController = controller;
  let result: SitecoreHarvestResult | undefined = undefined;
  try {
    const response = await fetch(link, { credentials: "same-origin" });
    if (!response.ok) return undefined;
    const fetchedDoc = new DOMParser().parseFromString(await response.text(), "text/html");
    result = await harvestSitecore(fetchedDoc, controller.signal, filters, (step, status) => handleHarvestProgress(progressDoc, step, status),);

  } catch (error) {
    extensionLog.warn("Reference graph: failed to re-harvest for clicked node", { link, error });
  }
  return result;
}
