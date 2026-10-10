import { SITECORE } from "../../../constants/sitecore";
import { buildFoblesUrl } from "../../features/augmentor/helper";
import { extractGuid } from "../../features/augmentor/shared/guid";
import { buildGalleryLinksUrl, findFieldInput, getParentPath, getTemplateGuid, resolveDatasourceLink, resolveQuickInfoForRenderingId } from "../../features/jump-flyout/reference-graph";
import { extensionLog } from "../../logger";
import { getGlyphId, getGlyphState, waitForExpansion, readChildNodes } from "../../macros/tree-expand-macro";
import { getCurrentItemId } from "../jump-flyout/ai-pages";
import { getQuickInfo } from "../jump-flyout/quick-info";
import { BUILD_STEPS } from "./build-steps";
import { parseDevice } from "./layout-parsing";
import type { itemNodeData, ReferenceGraphResult } from "./reference-graph.types";
import { CONST } from "../../../constants/const";
import type { BuildContext } from "./graph.types";
import { initializeReferenceGraphProgressModal, updateReferenceGraphProgressModal } from "./build-progress";


// Finds itemId's own tree node, expanding it first (and restoring it back to collapsed
// afterward) if needed, then returns its direct children. Only the live document can actually
// expand anything - see waitForExpansion's note - so a fetched/static document just reports
// whatever children happen to already be rendered (usually none).

export async function collectTreeChildren(doc: Document, itemId: string): Promise<itemNodeData[]> {
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
    (child): itemNodeData => ({
      name: child.name,
      itemId: child.itemId,
      link: buildFoblesUrl(child.itemId),
      path: undefined,
      templateLink: undefined,
      template: undefined,
    })
  );
}// Items that reference this one - Sitecore's own "Links" gallery (ribbon: Links -> "Items that
// refer to the selected item"), fetched directly instead of clicking through the ribbon. Same
// #Links/.scLink markup the Content Editor's own inline reference-links strategy already parses
// (src/content/features/augmentor/editor-strategies/reference-links.ts) - same extraction here,
// just without that strategy's DOM-mutation (button-building) half, which doesn't apply here.
// Scoped to specifically the "refers to" section's own .scRef sibling - #Links can carry other
// sections too (e.g. items the selected item itself uses), already captured elsewhere.
export async function collectReferrers(buildContext: BuildContext): Promise<itemNodeData[]> {
  let returnValue: itemNodeData[] = [];
  try {
    const fetchURL = buildGalleryLinksUrl(buildContext.itemId);
    extensionLog.debug(`Fetching referrers from URL: ${fetchURL}`);
    const response = await fetch(fetchURL, { credentials: "same-origin", signal: buildContext.signal });
    if (response.ok) {

      const fetchedDoc = new DOMParser().parseFromString(await response.text(), "text/html");
      const referrerAnchors = Array.from(fetchedDoc.querySelectorAll<HTMLElement>(".scMenuHeader"))
        .filter((header) => header.textContent?.toLowerCase().includes("refer to the selected item"))
        .flatMap((header) => Array.from(header.nextElementSibling?.querySelectorAll<HTMLAnchorElement>("a.scLink") ?? [])
        );

      returnValue = referrerAnchors
        .map((anchor) => {
          const referrerId = extractGuid(anchor.getAttribute("onclick"));
          // "Name - [/sitecore/full/path] - The reference from 'Field' field. Language: en, ..."
          const fullLabel = anchor.textContent?.replace(/\s+/g, " ").trim() ?? "";
          const name = fullLabel.split(" - [")[0]?.trim() || undefined;
          const path = fullLabel.match(/ - \[(.*?)\]/)?.[1]?.trim() || undefined;
          if (!referrerId) return undefined;
          return {
            name,
            itemId: referrerId,
            link: buildFoblesUrl(referrerId),
            path,
            templateLink: undefined,
            template: undefined,
          } as itemNodeData;
        })
        .filter((referrer): referrer is itemNodeData => referrer !== undefined);
      // if (candidateValues.length > 0) {

      //   returnValue = candidateValues;
      // }
    }
  } catch (error) {
    extensionLog.warn("Reference graph: failed to collect referring items", { itemId: buildContext.itemId, error });
  }
  return returnValue;
}
export async function buildReferenceGraph(
  doc: Document,
  signal: AbortSignal,
  progressDoc: Document = doc
): Promise<ReferenceGraphResult | undefined> {
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
  const templateGuid = getTemplateGuid(doc);
  const sharedDevice = sharedLayoutInput?.value
    ? parseDevice(sharedLayoutInput.value, CONST.SITECORE.DEVICES.DEFAULT)
    : { layoutId: undefined, controls: [] };
  const finalDevice = finalLayoutInput?.value
    ? parseDevice(finalLayoutInput.value, CONST.SITECORE.DEVICES.DEFAULT)
    : { layoutId: undefined, controls: [] };
  const layoutId = finalDevice.layoutId ?? sharedDevice.layoutId;

  // Not a real percentage (no good way to know total work upfront) - just a ticking counter so
  // Cancel/the progress message reads as "genuinely still working", not hung.
  const totalSteps = (layoutId ? 1 : 0) + finalDevice.controls.length + 2;



  const layoutDetailsQuickInfo = layoutId ? await resolveQuickInfoForRenderingId(layoutId, signal) : undefined;
  // if (layoutId) reportProgress(progressDoc, totalSteps);


  const rootItem = {
    itemId,
    name: docQuickInfo?.itemName,
    path: docQuickInfo?.itemPath,
    template: docQuickInfo?.template,
    link: buildFoblesUrl(itemId),
    templateLink: templateGuid ? buildFoblesUrl(templateGuid) : undefined,
  };

  const result: ReferenceGraphResult = {
    rootItem,
    parent: undefined,
    sharedLayoutName: undefined,
    sharedLayoutLink: undefined,
    sharedLayoutPath: undefined,
    controls: undefined,
    sections: undefined,
    childItems: undefined,
    referrers: undefined,
  };


  const buildContext: BuildContext = {
    doc,
    itemId,
    result,
    signal,
    rootItem,
  };

initializeReferenceGraphProgressModal(progressDoc);

for (const buildStep of BUILD_STEPS) {
  await buildStep.build(buildContext);
  updateReferenceGraphProgressModal(progressDoc, buildStep);
}

  // const referrers = await collectReferrers(itemId, signal);
  // reportProgress();
  // const result: ReferenceGraphResult = {
  //   itemId,
  //   itemName: docQuickInfo?.itemName,
  //   itemPath: docQuickInfo?.itemPath,
  //   itemTemplate: docQuickInfo?.template,
  //   itemTemplateLink: templateGuid ? buildFoblesUrl(templateGuid) : undefined,
  //   itemLink: buildFoblesUrl(itemId),
  //   parentName: parentPath?.split("/").filter(Boolean).pop() ?? undefined,
  //   parentLink: parentPath ? buildFoblesUrl(parentPath) : undefined,
  //   parentPath,
  //   sharedLayoutName: layoutDetailsQuickInfo?.itemName,
  //   sharedLayoutLink: layoutId ? buildFoblesUrl(layoutId) : undefined,
  //   sharedLayoutPath: layoutDetailsQuickInfo?.itemPath,
  //   controls: enrichedControls,
  //   sections: collectSections(doc),
  //   childItems: treeChildren.map(
  //     (child): ReferenceGraphChildItem => ({
  //       name: child.name,
  //       itemId: child.itemId,
  //       link: buildFoblesUrl(child.itemId),
  //       path: undefined,
  //     }),
  //   ),
  //   referrers,
  // };
  return result;
}

  
