// @source-path [fobles] src/content/features/reference-model/sitecore-item.types.ts

import type { FieldReference } from "../../field-reference-resolution/field-reference.types";
import type {
  SitecoreDeviceXml,
  SitecoreRenderingXml,
} from "../../foundation/harvesting/collectors/section-collector/layout-collector/sitecore-layout-xml-schema.types";

// Basic Sitecore item-shaped data - the harvester's conceptual output, with no enrichment
// requirement. Shared downward by both sitecore-worker (task payloads) and sitecore-harvester
// (collector results) so neither needs to import the other.
export function factoryItemGraphNodeData(
  overrides: Partial<Omit<ItemGraphNodeData, "type">> = {},
): ItemGraphNodeData {
  return {
    type: "scItem",
    scItemName: undefined,
    scItemId: undefined,
    link: undefined,
    scItemPath: undefined,
    scTemplate: undefined,
    scItemIcon: undefined,
    rawMarkup: undefined,
    ...overrides,
  };
}

export type ItemGraphNodeData = {
  type: "scItem";
  scItemName: string | undefined;
  scItemId: string | undefined;
  link: string | undefined;
  scItemPath: string | undefined;
  scTemplate: ItemGraphNodeData | undefined;
  // Item header icon image src, captured during quick-info enrichment. Never confused with field
  // icons, tree-node glyphs, layout-device icons, or the Standard Template "Icon" field.
  scItemIcon: string | undefined;
  // Diagnostics only: the raw quick-info/anchor markup that was scraped+parsed to produce this
  // item's fields above. Never read by business logic - inspect-only.
  rawMarkup: string | undefined;
};

export type RootItem = ItemGraphNodeData & {
  scItemId: string;
};

export type SitecoreHarvestSection = {
  name: string;
  fields: readonly SitecoreHarvestField[];
};

export type SitecoreHarvestField = {
  label: string;
  value: string | undefined;
  // One per resolved Sitecore item reference found in this field's raw value - see
  // field-reference-resolution/field-reference-resolution.ts for how these are produced.
  links: readonly HarvestFieldLink[];
  // Diagnostics only: the raw field-marker outerHTML this label/value/links were parsed from.
  rawMarkup: string | undefined;
};

export type HarvestFieldLink = FieldReference & {
  valueItem: ItemGraphNodeData;
};

export type LayoutSectionField = {
  name: string | undefined;
  devices: LayoutDevice[];
  // Diagnostics only: the raw Renderings/Final renderings field XML this was parsed from.
  rawMarkup: string | undefined;
};

export type ScControl = {
  uid: string | undefined;
  rendering: ItemGraphNodeData;
  datasource: ItemGraphNodeData | undefined;
  placeholder: string | undefined;
  parameters: Record<string, string>;
  p_before: string | undefined;
  p_after: string | undefined;
  rawData: SitecoreRenderingXml;
};

export type LayoutDevice = {
  scDeviceItem: ItemGraphNodeData;
  scPageLayoutItem: ItemGraphNodeData | undefined;
  scControls: ScControl[];
  rawData: SitecoreDeviceXml;
};
