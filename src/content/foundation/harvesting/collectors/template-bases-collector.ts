import { SITECORE } from "../../../../constants/sitecore.ts";
import { normalizeHistoryId } from "../../../../shared/item-history/item-history-model.ts";
import { KNOWN_FIELD_REFERENCE_RESOLVERS } from "../../../field-reference-resolution/field-reference-resolvers.ts";
import { extractFieldLabel } from "./helpers/field-harvester.ts";
import type { SitecoreHarvestSection } from "../../reference-data/model/sitecore-item.types.ts";

function parseBaseIds(value: string): readonly string[] | undefined {
  const raw = value.trim();
  const ids = raw ? raw.split("|").map(normalizeHistoryId) : [];
  return ids.every((id) => id !== undefined) ? [...new Set(ids)] : undefined;
}

export function collectTemplateBasesFromSections(sections: readonly SitecoreHarvestSection[]): readonly string[] | undefined {
  const expected = SITECORE.ITEM_KIND.FIELD_LABELS.BASE_TEMPLATE.toLowerCase();
  const field = sections.flatMap((section) => section.fields)
    .find((entry) => entry.label.replace(/:+$/, "").trim().toLowerCase() === expected);
  return field?.value === undefined ? undefined : parseBaseIds(field.value);
}

export function collectTemplateBases(doc: Document): readonly string[] | undefined {
  let bases: readonly string[] | undefined;
  const expected = SITECORE.ITEM_KIND.FIELD_LABELS.BASE_TEMPLATE.toLowerCase();
  const marker = Array.from(doc.querySelectorAll<HTMLElement>(SITECORE.SELECTORS.EDITOR_FIELD_MARKER))
    .find((field) => extractFieldLabel(field).replace(/:+$/, "").trim().toLowerCase() === expected);
  if (marker) {
    for (const resolver of KNOWN_FIELD_REFERENCE_RESOLVERS) {
      const references = resolver(marker);
      if (references !== undefined && bases === undefined) {
        const ids = references.map((reference) => normalizeHistoryId(reference.target));
        if (ids.every((id) => id !== undefined)) {
          bases = ids;
        }
      }
    }
    const control = marker.querySelector<HTMLInputElement | HTMLTextAreaElement>(SITECORE.SELECTORS.CONTENT_CONTROL);
    if (bases === undefined && control && typeof control.value === "string" && /^(INPUT|TEXTAREA)$/.test(control.tagName)) {
      bases = parseBaseIds(control.value);
    }
  }
  return bases === undefined ? undefined : [...new Set(bases)];
}