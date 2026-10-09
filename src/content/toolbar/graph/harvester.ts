import { CONST } from "../../../constants/const";
import { extensionLog } from "../../logger";
import { EXCLUDED_SECTION_NAMES } from "./graph.const";
import { renderingGraphAbortController, buildReferenceGraph, extractFieldLabel, isHandledElsewhere, readRawFieldValue } from "./rendering-graph";
import { resolveFieldLinks } from "./rendering-graph-field-links";
import type { RenderingGraphField, ReferenceGraphResult, RenderingGraphSection } from "./rendering-graph.types";


// Left-clicking a graph node re-roots the SAME open modal at that item, with no page navigation
// at all - fetches that item's own content-editor page (same technique resolveRenderingDetails
// already uses) and re-harvests against the fetched document instead of the live one. Raw
// Values/Standard Fields are already confirmed on by the time any node is clickable, so the
// fetched page reflects them too (both are session-level view settings, not per-page).

export async function harvestGraphForLink(link: string, progressDoc: Document, renderingGraphAbortController: AbortController | undefined): Promise<ReferenceGraphResult | undefined> {
  const controller = new AbortController();
  renderingGraphAbortController = controller;
  try {
    const response = await fetch(link, { credentials: "same-origin" });
    if (!response.ok) return undefined;
    const fetchedDoc = new DOMParser().parseFromString(await response.text(), "text/html");
    return await buildReferenceGraph(fetchedDoc, controller.signal, progressDoc);
  } catch (error) {
    extensionLog.warn("Rendering graph: failed to re-harvest for clicked node", { link, error });
    return undefined;
  }
}export function collectSections(doc: Document): RenderingGraphSection[] {
  const sections: RenderingGraphSection[] = [];

  doc.querySelectorAll<HTMLElement>(CONST.SITECORE.SELECTORS.SECTION_CAPTION).forEach((caption) => {
    const name = caption.textContent?.trim() ?? "";
    if (!name || EXCLUDED_SECTION_NAMES.has(name.toLowerCase())) return;

    const panelId = caption.querySelector("img[aria-controls]")?.getAttribute("aria-controls") ?? `${caption.id}_controls`;
    const panel = doc.getElementById(panelId);
    if (!panel) return;

    const fields: RenderingGraphField[] = [];
    panel.querySelectorAll<HTMLElement>(CONST.SITECORE.SELECTORS.EDITOR_FIELD_MARKER).forEach((marker) => {
      const label = extractFieldLabel(marker);
      if (!label || isHandledElsewhere(label)) return;

      const links = resolveFieldLinks(marker);
      if (links) {
        fields.push({ label, value: links.map((link) => link.label).join(", "), links });
        return;
      }

      const value = readRawFieldValue(marker);
      if (!value) return;
      fields.push({ label, value });
    });

    if (fields.length > 0) sections.push({ name, fields });
  });

  return sections;
}

