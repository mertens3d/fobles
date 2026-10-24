// @source-path [fobles] src/content/sitecore-harvester/collectors/referrer-collector.ts

import { extractGuid } from "../../features/augmentor/shared/guid";
import { extensionLog } from "../../logger";
import { buildGalleryLinksUrl } from "./helpers/harvest-helpers";
import { type HarvestContext, } from "../sitecore-harvester.types";
import { factoryItemGraphNodeData, type ItemGraphNodeData } from "../../features/reference-model/sitecore-item.types";

// Items that reference this one - Sitecore's own "Links" gallery (ribbon: Links -> "Items that
// refer to the selected item"), fetched directly instead of clicking through the ribbon. Same
// #Links/.scLink markup the Content Editor's own inline reference-links strategy already parses
// (src/content/features/augmentor/editor-strategies/reference-links.ts) - same extraction here,
// just without that strategy's DOM-mutation (button-building) half, which doesn't apply here.
// Scoped to specifically the "refers to" section's own .scRef sibling - #Links can carry other
// sections too (e.g. items the selected item itself uses), already captured elsewhere.
export async function collectReferrers(
  harvestContext: HarvestContext,
): Promise<void> {
  let returnValue: ItemGraphNodeData[] = [];
  try {
    const fetchURL = buildGalleryLinksUrl(harvestContext.rootItem?.scItemId);
    if (fetchURL) {
      extensionLog.debug(`Fetching referrers from URL: ${fetchURL}`);
      const response = await fetch(fetchURL, {
        credentials: "same-origin",
        signal: harvestContext.signal,
      });
      if (response.ok) {
        const fetchedDoc = new DOMParser().parseFromString(
          await response.text(),
          "text/html",
        );
        const referrerAnchors = Array.from(
          fetchedDoc.querySelectorAll<HTMLElement>(".scMenuHeader"),
        )
          .filter((header) =>
            header.textContent
              ?.toLowerCase()
              .includes("refer to the selected item"),
          )
          .flatMap((header) =>
            Array.from(
              header.nextElementSibling?.querySelectorAll<HTMLAnchorElement>(
                "a.scLink",
              ) ?? [],
            ),
          );

        returnValue = referrerAnchors
          .map((anchor): ItemGraphNodeData | undefined => {
            const referrerId = extractGuid(anchor.getAttribute("onclick"));
            // "Name - [/sitecore/full/path] - The reference from 'Field' field. Language: en, ..."
            const fullLabel =
              anchor.textContent?.replace(/\s+/g, " ").trim() ?? "";
            const name = fullLabel.split(" - [")[0]?.trim() || undefined;
            const path =
              fullLabel.match(/ - \[(.*?)\]/)?.[1]?.trim() || undefined;
            if (!referrerId) return undefined;
            return factoryItemGraphNodeData({
              scItemName: name,
              scItemId: referrerId,
              scItemPath: path,
              rawMarkup: anchor.outerHTML,
            });
          })
          .filter(
            (referrer): referrer is ItemGraphNodeData => referrer !== undefined,
          );
        // if (candidateValues.length > 0) {
        //   returnValue = candidateValues;
        // }
      }
    }
  } catch (error) {
    extensionLog.warn("Reference graph: failed to collect referring items", {
      itemId: harvestContext.rootItem?.scItemId,
      error,
    });
  }

  harvestContext.result.referrers = returnValue;
}
