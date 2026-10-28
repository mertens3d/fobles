// @source-path [fobles] src/content/foundation/reference-data/model/sitecore-item.types.ts

import type { FieldReference } from "../../../field-reference-resolution/field-reference.types";
import type {
  SitecoreDeviceXml,
  SitecoreRenderingXml,
} from "../../harvesting/collectors/section-collector/layout-collector/sitecore-layout-xml-schema.types";

export type ItemHarvestFacts = {
  parent?: { parent: ItemGraphNodeData | undefined };
  children?: { childItems: readonly ItemGraphNodeData[] };
  referrers?: { referrers: readonly ItemGraphNodeData[] };
  customSections?: { sections: readonly SitecoreHarvestSection[] };
  standardSections?: { sections: readonly SitecoreHarvestSection[] };
  layout?: { layoutSectionFields: readonly LayoutSectionField[] };
};

export function factoryItemGraphNodeData(overrides: Partial<Omit<ItemGraphNodeData, "type">> = {}): ItemGraphNodeData {
  return {
    type: "scItem",
    scItemName: undefined,
    scItemId: undefined,
    link: undefined,
    scItemPath: undefined,
    scTemplate: undefined,
    scItemIcon: undefined,
    rawMarkup: undefined,
    facts: {},
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
  scItemIcon: string | undefined;
  rawMarkup: string | undefined;
  facts?: ItemHarvestFacts;
};

export type RootItem = ItemGraphNodeData & { scItemId: string };
export type SitecoreHarvestSection = { name: string; fields: readonly SitecoreHarvestField[] };
export type SitecoreHarvestField = { label: string; value: string | undefined; links: readonly HarvestFieldLink[]; rawMarkup: string | undefined };
export type HarvestFieldLink = FieldReference & { valueItem: ItemGraphNodeData };

export type LayoutSectionField = {
  name: string | undefined;
  devices: LayoutDevice[];
  rawMarkup: string | undefined;
};

export type LayoutPlacement = {
  path: string;
  name: string;
  sourcePaths: string[];
  placements: LayoutPlacement[];
  controls: ScControl[];
};

export type ScControl = {
  uid: string | undefined;
  rendering: ItemGraphNodeData;
  datasource: ItemGraphNodeData | undefined;
  parameters: Record<string, string>;
  p_before: string | undefined;
  p_after: string | undefined;
  rawData: SitecoreRenderingXml;
};

export type LayoutDevice = {
  scDeviceItem: ItemGraphNodeData;
  scPageLayoutItem: ItemGraphNodeData | undefined;
  placements: LayoutPlacement[];
  rawData: SitecoreDeviceXml;
};
