// @source-path [fobles] src/content/foundation/harvesting/collectors/section-collector/section-collector.ts

import { CONST } from "../../../../../constants/const";
import { SITECORE } from "../../../../../constants/sitecore";
import { type HarvestFieldLink, type ItemGraphNodeData, factoryItemGraphNodeData, type SitecoreHarvestField, type SitecoreHarvestSection } from "../../../reference-data/model/sitecore-item.types";
import { isGuidLike } from "../../../sitecore/guid";
import { resolveFieldReferences } from "../../../../field-reference-resolution/field-reference-resolution";
import type { HarvestContext } from "../../sitecore-harvester.types";
import { extractFieldLabel, isHandledElsewhere, readRawFieldValue } from "../helpers/field-harvester";
import { isStandardSectionName } from "./section-classification";

export function collectSections(harvestContext: HarvestContext): Promise<void> {
  const sections: SitecoreHarvestSection[] = [];

  harvestContext.doc.querySelectorAll<HTMLElement>(SITECORE.SELECTORS.SECTION_CAPTION).forEach((caption) => {
    const name = caption.textContent?.trim() ?? "";

    if (name && !CONST.SITECORE.HARVEST.EXCLUDED_SECTION_NAMES_LC.has(name.toLowerCase())) {
      const sectionData: SitecoreHarvestSection = { name, fields: collectSectionFields(caption, harvestContext.doc) };
      if (sectionData.fields.length > 0) sections.push(sectionData);
    }
  });

  harvestContext.result.customFieldSections = sections.filter((section) => !isStandardSectionName(section.name));
  harvestContext.result.standardFieldSections = sections.filter((section) => isStandardSectionName(section.name));

  return Promise.resolve();
}

function collectSectionFields(caption: HTMLElement, doc: Document): SitecoreHarvestField[] {
  const fields: SitecoreHarvestField[] = [];
  const panelId = caption.querySelector("img[aria-controls]")?.getAttribute("aria-controls") ?? `${caption.id}_controls`;
  const panel = doc.getElementById(panelId);

  panel?.querySelectorAll<HTMLElement>(SITECORE.SELECTORS.EDITOR_FIELD_MARKER).forEach((marker) => {
    const field = getSectionField(marker);
    const hasData = Boolean(field.value?.trim()) || field.links.length > 0;
    if (field.label && !isHandledElsewhere(field.label) && hasData) fields.push(field);
  });

  return fields;
}

function buildReferenceValueItem(target: string, label: string | undefined): ItemGraphNodeData {
  return isGuidLike(target)
    ? factoryItemGraphNodeData({ scItemId: target, scItemName: label })
    : factoryItemGraphNodeData({ scItemPath: target, scItemName: label });
}

function getSectionField(marker: HTMLElement): SitecoreHarvestField {
  const field: SitecoreHarvestField = { label: extractFieldLabel(marker), value: undefined, links: [], rawMarkup: marker.outerHTML };

  if (field.label && !isHandledElsewhere(field.label)) {
    const rawValue = readRawFieldValue(marker);
    const resolution = resolveFieldReferences(marker, rawValue, field.label);
    field.value = resolution.displayValue?.trim() || undefined;
    field.links = resolution.references.map((reference): HarvestFieldLink => ({
      ...reference,
      valueItem: buildReferenceValueItem(reference.target, reference.label),
    }));
  }

  return field;
}
