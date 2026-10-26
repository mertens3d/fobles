// @source-path [fobles] src/content/foundation/sitecore/current-item.ts
import { extractGuid } from "./guid";
import { getQuickInfo } from "./quick-info";

// The Sitecore item shown in the Content Editor right now, read from the page's own Quick Info table.
export const getCurrentItemId = (doc: Document): string | null =>
  extractGuid(getQuickInfo(doc).itemId);
