// @source-path [fobles] src/content/sitecore-harvester/harvest-sitecore.ts

import { extensionLog } from "../logger";
import {
  getGlyphId,
  getGlyphState,
  waitForExpansion,
  readChildNodes,
} from "../macros/tree-expand-macro";
import { getQuickInfo } from "../toolbar/jump-flyout/quick-info";
import { HARVEST_STEPS } from "./harvest-steps";
import {
  factoryItemGraphNodeData,
  type HarvestProgressCallback,
  type ItemGraphNodeData,
  type SitecoreHarvestResult,
} from "./sitecore-harvester.types";
import type {
  RootItem,
  SitecoreHarvestFiltersState,
} from "./sitecore-harvester.types";
import type { HarvestContext } from "./sitecore-harvester.types";
import { enrichSitecoreHarvestResult } from "./enrichment/result-enricher";

// Finds itemId's own tree node, expanding it first (and restoring it back to collapsed
// afterward) if needed, then returns its direct children. Only the live document can actually
// expand anything - see waitForExpansion's note - so a fetched/static document just reports
// whatever children happen to already be rendered (usually none).

export async function collectTreeChildren(
  doc: Document,
  itemId: string | undefined,
): Promise<ItemGraphNodeData[]> {
  let result: ItemGraphNodeData[] = [];
  if (itemId) {
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

    if (
      initialState === "collapsed" &&
      getGlyphState(currentGlyph) === "expanded"
    ) {
      currentGlyph.click();
    }

    result = children.map(
      (child): ItemGraphNodeData => ({
        type: "scItem",
        scItemName: child.name,
        scItemId: child.itemId,
        link: undefined,
        scItemPath: undefined,
        scTemplate: undefined,
      }),
    );
  }
  return result;
}
export async function harvestSitecore(
  doc: Document,
  signal: AbortSignal,
  filters: SitecoreHarvestFiltersState,
  onProgress?: HarvestProgressCallback,
): Promise<SitecoreHarvestResult | undefined> {
  const rootItem = harvestStepRootItem(doc, onProgress);
  let result: SitecoreHarvestResult | undefined = undefined;

  if (rootItem) {
    result = {
      rootItem: rootItem,
      parent: undefined,
      layoutSectionFields: undefined,
      sections: undefined,
      childItems: undefined,
      referrers: undefined,
    };

    const harvestContext: HarvestContext = {
      doc,
      result,
      signal,
      rootItem,
    };

    for (const harvestStep of HARVEST_STEPS) {
      if (!filters[harvestStep.filterKey]) {
        onProgress?.(harvestStep, "skipped");
      }
    }

    const enabledHarvestSteps = HARVEST_STEPS.filter(
      (harvestStep) => filters[harvestStep.filterKey],
    );

    for (const harvestStep of enabledHarvestSteps) {
      await harvestStep.build(harvestContext);
      onProgress?.(harvestStep, "complete");
      await testingDelay(0);
    }

    await harvestStepEnrichData(onProgress, result, signal);
  }

  return result;
}

function harvestStepRootItem(
  doc: Document,
  onProgress: HarvestProgressCallback | undefined,
): RootItem | undefined {
  // const itemId = getCurrentItemId(doc);
  let rootItem: RootItem | undefined = undefined;
  const docQuickInfo = getQuickInfo(doc);
  if (!docQuickInfo.itemId) {
    extensionLog.error("Reference graph: could not resolve current item id");
  } else {
    const result = factoryItemGraphNodeData({
      scItemId: docQuickInfo.itemId,
      scItemName: docQuickInfo.itemName,
      scItemPath: docQuickInfo.itemPath,
      scTemplate: factoryItemGraphNodeData({
        scItemId: docQuickInfo?.template?.id,
        scItemPath: docQuickInfo?.template?.path,
      }),
    }) as RootItem;
    rootItem = result;
  }
  onProgress?.(
    {
      stepKey: "root-item",
      label: "Root Item",
    },
    "complete",
  );

  return rootItem;
}

async function harvestStepEnrichData(
  onProgress: HarvestProgressCallback | undefined,
  result: SitecoreHarvestResult,
  signal: AbortSignal,
) {
  onProgress?.(
    {
      stepKey: "enrichment",
      label: "Enriching Items",
    },
    "active",
  );

  await enrichSitecoreHarvestResult(result, signal, (current, total) => {
    onProgress?.(
      {
        stepKey: "enrichment",
        label: `Enriching Items (${current}/${total})`,
      },
      "active",
    );
  });

  extensionLog.debug("ENRICHED SITECORE HARVEST RESULT", result);

  onProgress?.(
    {
      stepKey: "enrichment",
      label: "Enriching Items",
    },
    "complete",
  );
}

function testingDelay(milliseconds: number): Promise<void> {
  if (milliseconds > 0) {
    return new Promise((resolve) => {
      setTimeout(resolve, milliseconds);
    });
  }
  return Promise.resolve();
}
