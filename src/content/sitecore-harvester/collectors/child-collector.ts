import { collectTreeChildren } from "../harvest-sitecore";
import type { HarvestContext } from "../sitecore-harvester.types";

export async function collectChildren(harvestContext: HarvestContext): Promise<void> {
  harvestContext.result.childItems = await collectTreeChildren(harvestContext.doc, harvestContext.itemId);
  return Promise.resolve();
}