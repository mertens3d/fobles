// Quick Info's Template row carries its guid in a differently-classed readonly input
// (scEditorHeaderQuickInfoInputID) than every other row (scEditorHeaderQuickInfoInput) -
// getQuickInfoValue only reads the latter, so the template's guid needs its own lookup.

import { SITECORE } from "../../constants/sitecore";
import { buildFoblesUrl } from "../features/augmentor/helper";
import { formatFoId } from "../features/augmentor/shared/guid";
import { extensionLog } from "../logger";
import { getQuickInfo } from "../toolbar/jump-flyout/quick-info";
import type { QuickInfo } from "../toolbar/types";

export function getTemplateGuid(doc: Document): string | undefined {
  return doc.querySelector<HTMLInputElement>("input.scEditorHeaderQuickInfoInputID[readonly]")?.value.trim() || undefined;
}

export async function resolveQuickInfoForRenderingId(
  renderingId: string,
  signal: AbortSignal
): Promise<QuickInfo | undefined> {
  try {
    const response = await fetch(buildFoblesUrl(renderingId), { credentials: "same-origin", signal });
    if (!response.ok) return undefined;
    const fetchedDoc = new DOMParser().parseFromString(await response.text(), "text/html");
    // const path = getQuickInfoValue(fetchedDoc, "Item path:");
    const fetchDocQuickInfo = getQuickInfo(fetchedDoc);
    return fetchDocQuickInfo;
  } catch (error) {
    extensionLog.warn("Reference graph: failed to resolve rendering details", { renderingId, error });
    return undefined;
  }
}
export function findFieldInput(doc: Document, labelPrefix: string): HTMLInputElement | undefined {
  const label = Array.from(
    doc.querySelectorAll<HTMLElement>(SITECORE.SELECTORS.FIELD_LABEL)
  ).find((element) => element.textContent?.trim().toLowerCase().startsWith(labelPrefix.toLowerCase())
  );
  return (
    label
      ?.closest(SITECORE.SELECTORS.FIELD_CELL)
      ?.querySelector<HTMLInputElement>(SITECORE.SELECTORS.CONTENT_CONTROL) ?? undefined
  );
}
export function buildGalleryLinksUrl(itemId: string): string {
  const origin = `${window.location.protocol}//${window.location.hostname}`;
  const params = new URLSearchParams({
    [SITECORE.SEARCH_PARAMS.XML_CONTROL]: "Gallery.Links",
    [SITECORE.SEARCH_PARAMS.ITEM_ID]: formatFoId(itemId),
    la: "en",
    vs: "1",
    db: "master",
    sc_content: "master",
    ShowEditor: "1",
    "Ribbon.RenderTabs": "true",
  });
  return `${origin}${SITECORE.RELATIVE_PATHS_ENCODED.SHELL_DEFAULT}?${params.toString()}`;
}
