// @source-path [fobles] src/content/sitecore-harvester/harvest-sitecore.ts

import { findFieldInput } from "./collectors/helpers/harvest-helpers";
import { extensionLog } from "../logger";
import { getGlyphId, getGlyphState, waitForExpansion, readChildNodes } from "../macros/tree-expand-macro";
import { getCurrentItemId } from "../toolbar/jump-flyout/ai-pages";
import { getQuickInfo } from "../toolbar/jump-flyout/quick-info";
import { HARVEST_STEPS } from "./harvest-steps";
import { factoryItemGraphNodeData, type HarvestProgressCallback, type ItemGraphNodeData, type SitecoreHarvestResult } from "./sitecore-harvester.types";
import type { RootItem, SitecoreHarvestFiltersState } from "./sitecore-harvester.types";
import type { HarvestContext } from "./sitecore-harvester.types";
import { enrichSitecoreHarvestResult } from "./enrichment/result-enricher";

// Finds itemId's own tree node, expanding it first (and restoring it back to collapsed
// afterward) if needed, then returns its direct children. Only the live document can actually
// expand anything - see waitForExpansion's note - so a fetched/static document just reports
// whatever children happen to already be rendered (usually none).

export async function collectTreeChildren(doc: Document, itemId: string): Promise<ItemGraphNodeData[]> {
  const glyphId = getGlyphId(itemId);
  const glyph = doc.getElementById(glyphId) as HTMLImageElement | undefined;
  if (!glyph) return [];

  const initialState = getGlyphState(glyph);
  if (initialState === "leaf") return [];

  let currentGlyph = glyph;
  if (initialState === "collapsed") {
    currentGlyph.click();
    currentGlyph = (await waitForExpansion(doc, glyphId)) ?? currentGlyph;
  }

  const children = readChildNodes(currentGlyph);

  if (initialState === "collapsed" && getGlyphState(currentGlyph) === "expanded") {
    currentGlyph.click();
  }

  return children.map(
    (child): ItemGraphNodeData => ({
      type: "scItem",
      scItemName: child.name,
      scItemId: child.itemId,
      link: undefined,
      scItemPath: undefined,
      scTemplate: undefined,
    })
  );
}
export async function harvestSitecore(
  doc: Document,
  signal: AbortSignal,
  filters: SitecoreHarvestFiltersState,
  onProgress?: HarvestProgressCallback,
): Promise<SitecoreHarvestResult | undefined> {
  const itemId = getCurrentItemId(doc);
  if (!itemId) {
    extensionLog.warn("Reference graph: could not resolve current item id");
    return undefined;
  }

  const sharedLayoutInput = findFieldInput(doc, "Renderings");
  const finalLayoutInput = findFieldInput(doc, "Final renderings") ?? sharedLayoutInput;
  if (!finalLayoutInput?.value) {
    // Expected for items with no layout defined at all (e.g. folders) - not an error. The item
    // itself is still a valid root; it just won't have a device/layout/control branch under it.
    extensionLog.info(
      "Reference graph: no Renderings field found for this item (no layout, or View > Standard Fields/Raw Values is off)"
    );
  }
  const docQuickInfo = getQuickInfo(doc);

  const rootItem = factoryItemGraphNodeData({
    scItemId: itemId,
    scItemName: docQuickInfo.itemName,
    scItemPath: docQuickInfo.itemPath,
    scTemplate: factoryItemGraphNodeData({
      scItemId: docQuickInfo?.template?.id,
      scItemPath: docQuickInfo?.template?.path,
    }),
  }) as RootItem;


  onProgress?.(
    {
      stepKey: "root-item",
      label: "Root Item",
    },
    "complete",
  );

  const result: SitecoreHarvestResult = {
    rootItem,
    parent: undefined,
    layoutSectionFields: undefined,
    sections: undefined,
    childItems: undefined,
    referrers: undefined,
  };

  const harvestContext: HarvestContext = {
    doc,
    itemId,
    result,
    signal,
    rootItem,
  };

  for (const harvestStep of HARVEST_STEPS) {
    if (!filters[harvestStep.filterKey]) {
      onProgress?.(harvestStep, "skipped");
    }
  }

  const enabledHarvestSteps = HARVEST_STEPS.filter((harvestStep) => filters[harvestStep.filterKey],);

  for (const harvestStep of enabledHarvestSteps) {
    await harvestStep.build(harvestContext);
    onProgress?.(harvestStep, "complete");
    await testingDelay(0);
  }

  onProgress?.(
    {
      stepKey: "enrichment",
      label: "Enriching Items",
    },
    "active",
  );

  await enrichSitecoreHarvestResult(
    result,
    signal,
  );

  extensionLog.debug(
    "ENRICHED SITECORE HARVEST RESULT",
    result,
  );

  onProgress?.(
    {
      stepKey: "enrichment",
      label: "Enriching Items",
    },
    "complete",
  );

  return result;
}

function testingDelay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}