// @source-path [fobles] src/content/features/reference-graph/lifecycle/root-revision.ts

import { CONST } from "../../../../constants/const";
import { extractRevisionFromIconUrl } from "../../../sitecore-harvester/enrichment/item-enricher.ts";

// Cheap on purpose: reads the CURRENT page's own header icon directly - no worker navigation,
// no Raw Values/Standard Fields toggling. Only ever meaningful for the item the user is
// currently viewing (the root); referenced items have no "current document" to read from.
export function readLiveRootRevision(doc: Document): string | undefined {
  const icon = doc.querySelector<HTMLImageElement>(CONST.SITECORE.SELECTORS.ITEM_HEADER_ICON);
  return extractRevisionFromIconUrl(icon?.src);
}
