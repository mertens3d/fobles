// @source-path [fobles] src/content/foundation/harvesting/harvest-sitecore.ts

import { type ItemGraphNodeData, factoryItemGraphNodeData, type RootItem } from "../reference-data/model/sitecore-item.types";
import type { TreeChildNode } from "../reference-data/model/tree-child-node.types";
import { extensionLog } from "../../logger";
import {
  getGlyphId,
  getGlyphState,
  waitForExpansion,
  readChildNodes,
} from "../sitecore/macros/tree-expand-macro";
import { getQuickInfo } from "../sitecore/quick-info";

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
      (child: TreeChildNode): ItemGraphNodeData =>
        factoryItemGraphNodeData({
          scItemName: child.name,
          scItemId: child.itemId,
          rawMarkup: child.rawMarkup,
        }),
    );
  }
  return result;
}

// Resolves the page's own current item as a RootItem, purely from the quick-info chrome
// already rendered on `doc` - reused as the first thing every worker task does against a
// freshly-navigated worker tab, as well as by the foreground coordinator for a live doc.
export function harvestStepRootItem(doc: Document): RootItem | undefined {
  let rootItem: RootItem | undefined = undefined;
  const docQuickInfo = getQuickInfo(doc);
  if (!docQuickInfo.itemId) {
    extensionLog.error("Reference graph: could not resolve current item id");
  } else {
    rootItem = factoryItemGraphNodeData({
      scItemId: docQuickInfo.itemId,
      scItemName: docQuickInfo.itemName,
      scItemPath: docQuickInfo.itemPath,
      rawMarkup: docQuickInfo.rawMarkup,
      scTemplate: factoryItemGraphNodeData({
        scItemId: docQuickInfo?.template?.id,
        scItemPath: docQuickInfo?.template?.path,
      }),
    }) as RootItem;
  }
  return rootItem;
}
