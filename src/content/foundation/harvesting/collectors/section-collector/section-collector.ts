// @source-path [fobles] src/content/foundation/harvesting/collectors/section-collector/section-collector.ts

import { CONST } from "../../../../../constants/const";
import { SITECORE } from "../../../../../constants/sitecore";
import { type SitecoreHarvestSection, type SitecoreHarvestField, type ItemGraphNodeData, factoryItemGraphNodeData, type HarvestFieldLink } from "../../../../features/reference-model/sitecore-item.types";
import { isGuidLike } from "../../../../features/augmentor/shared/guid";
import { resolveFieldReferences } from "../../../../field-reference-resolution/field-reference-resolution";
import type { HarvestContext } from "../../sitecore-harvester.types";
import { extractFieldLabel, isHandledElsewhere, readRawFieldValue } from "../helpers/field-harvester";
import { isStandardSectionName } from "./section-classification";

export function collectSections(harvestContext: HarvestContext): Promise<void> {
  const sections: SitecoreHarvestSection[] = [];

  harvestContext.doc.querySelectorAll<HTMLElement>(SITECORE.SELECTORS.SECTION_CAPTION).forEach((caption) => {
    const name = caption.textContent?.trim() ?? "";

    if (name && !CONST.SITECORE.HARVEST.EXCLUDED_SECTION_NAMES_LC.has(name.toLowerCase())) {
      const sectionData: SitecoreHarvestSection = { name, fields: [] };
      sectionData.fields = collectSectionFields(sectionData, caption, harvestContext.doc);

      if (sectionData.fields.length > 0) sections.push(sectionData);
    }
  });

  harvestContext.result.customFieldSections = sections.filter((section) => !isStandardSectionName(section.name));
  harvestContext.result.standardFieldSections = sections.filter((section) => isStandardSectionName(section.name));
  return Promise.resolve();
}

const collectSectionFields = (section: SitecoreHarvestSection, caption: HTMLElement, doc: Document): SitecoreHarvestField[] => {
  const fields: SitecoreHarvestField[] = [];
  const panelId = caption.querySelector("img[aria-controls]")?.getAttribute("aria-controls") ?? `${caption.id}_controls`;
  const panel = doc.getElementById(panelId);

  if (panel) {
    panel.querySelectorAll<HTMLElement>(SITECORE.SELECTORS.EDITOR_FIELD_MARKER).forEach((marker) => {
      const candidateSectionField = getSectionField(marker);
      if (candidateSectionField.label && !isHandledElsewhere(candidateSectionField.label)) fields.push(candidateSectionField);
    });
  }

  return fields;
};

function buildReferenceValueItem(target: string, label: string | undefined): ItemGraphNodeData {
  return isGuidLike(target)
    ? factoryItemGraphNodeData({ scItemId: target, scItemName: label })
    : factoryItemGraphNodeData({ scItemPath: target, scItemName: label });
}

const getSectionField = (marker: HTMLElement): SitecoreHarvestField => {
  const sectionField: SitecoreHarvestField = { label: "", value: "", links: [], rawMarkup: marker.outerHTML };
  sectionField.label = extractFieldLabel(marker);

  if (sectionField.label && !isHandledElsewhere(sectionField.label)) {
    const rawValue = readRawFieldValue(marker);
    const resolution = resolveFieldReferences(marker, rawValue, sectionField.label);

    sectionField.value = resolution.displayValue;
    sectionField.links = resolution.references.map((reference): HarvestFieldLink => ({
      ...reference,
      valueItem: buildReferenceValueItem(reference.target, reference.label),
    }));
  }

  return sectionField;
};