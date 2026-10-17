// @source-path [fobles] src/content/sitecore-harvester/sitecore-harvester.types.ts

import type { FieldReference } from "../field-reference-resolution/field-reference.types";
import type {
  SitecoreDeviceXml,
  SitecoreRenderingXml,
} from "./collectors/section-collector/layout-collector/sitecore-layout-xml-schema.types";

export type HarvestContext = {
  doc: Document;
  result: SitecoreHarvestResult;
  signal: AbortSignal;
  rootItem: ItemGraphNodeData;
};

export type ProgressStep = {
  stepKey: StepKey;
  label: string;
};

export type HarvestStep = ProgressStep & {
  stepKey: StepKey;
  filterKey: keyof SitecoreHarvestFiltersState;
  label: string;
  build: (harvestContext: HarvestContext) => Promise<void>;
};

export function isHarvestStep(step: ProgressStep): step is HarvestStep {
  return "filterKey" in step;
}

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
  // Diagnostics only: the raw quick-info/anchor markup that was scraped+parsed to produce this
  // item's fields above. Never read by business logic - inspect-only.
  rawMarkup: string | undefined;
};

export type RootItem = ItemGraphNodeData & {
  scItemId: string;
};

export type SitecoreHarvestResult = {
  rootItem: RootItem;
  parent: ItemGraphNodeData | undefined;
  layoutSectionFields: LayoutSectionField[] | undefined;
  sections: readonly SitecoreHarvestSection[] | undefined;
  childItems: readonly ItemGraphNodeData[] | undefined;
  referrers: readonly ItemGraphNodeData[] | undefined;
};

export type SitecoreHarvestFiltersState = {
  parent: boolean;
  children: boolean;
  layouts: boolean;
  referrers: boolean;
  sections: boolean;
  template: boolean;
};

export type SitecoreHarvestSection = {
  name: string;
  fields: readonly SitecoreHarvestField[];
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

export type SitecoreHarvestField = {
  label: string;
  value: string | undefined;
  // One per resolved Sitecore item reference found in this field's raw value - see
  // field-reference-resolution/field-reference-resolution.ts for how these are produced.
  links: readonly HarvestFieldLink[];
  // Diagnostics only: the raw field-marker outerHTML this label/value/links were parsed from.
  rawMarkup: string | undefined;
};

export type LayoutDevice = {
  scDeviceItem: ItemGraphNodeData;
  scPageLayoutItem: ItemGraphNodeData | undefined;
  scControls: ScControl[];
  rawData: SitecoreDeviceXml;
};

export type HarvestFieldLink = FieldReference & {
  valueItem: ItemGraphNodeData;
};

export type StepKey =
  | "fetch-document"
  | "parse-document"
  | "root-item"
  | "children"
  | "sections"
  | "layouts"
  | "referrers"
  | "parent"
  | "enrichment"
  | "build-graph";

export type HarvestProgressStatus =
  | "active"
  | "skipped"
  | "complete";

export type HarvestProgressCallback = (
  step: ProgressStep,
  status: HarvestProgressStatus,
) => void;

export type HarvestRequest = {
  requestId: string;
  url: string;
  filters: SitecoreHarvestFiltersState;
  existingResult?: SitecoreHarvestResult;
};