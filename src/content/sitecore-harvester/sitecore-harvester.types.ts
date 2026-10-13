export type HarvestContext = {
  doc: Document;
  itemId: string;
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

// One resolver per field-strategy, mirroring src/constants/_config.ts's per-strategy
// FoblesTopSelectors - but reading Sitecore's own raw markup directly (not the augmentor's
// injected buttons, which don't exist in a fetched/re-rooted document). Returns null when the
// marker isn't that strategy's shape at all, so collectSections' flat-text fallback still applies.

export type FieldLinkResolver = (marker: HTMLElement) => FieldLink[] | null;

export type FieldLink = {
  label: string;
  valueItem: ItemGraphNodeData;
};

export type SitecoreHarvestSection = {
  name: string;
  fields: readonly SitecoreHarvestField[];
};

export type LayoutSectionField = {
  name: string | undefined;
  devices: LayoutDevice[];
};

export type ScControl = {
    uid: string | undefined;
    rendering: ItemGraphNodeData;
    datasource: ItemGraphNodeData | undefined;
    placeholder: string | undefined;
    parameters: Record<string, string>;
    p_before: string | undefined;
    p_after: string | undefined;
};

export type SitecoreHarvestField = {
  label: string;
  value: string | undefined;
  // Set when a field-link strategy (xxxx.ts) recognized this field's raw
  // markup as a list of other items - e.g. treelist-ex's Insert options - so each one can render
  // as its own clickable node instead of being flattened into `value`.
  links: readonly HarvestFieldLink[];
};

export type LayoutDevice = {
  scDeviceItem: ItemGraphNodeData;
  scPageLayoutItem: ItemGraphNodeData | undefined;
  scControls: ScControl[];
};

export type HarvestFieldLink = {
  label: string;
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

export type HarvestProgressCallback = (step: ProgressStep, status: HarvestProgressStatus) => void;

export type BackgroundHarvestContext = {
  url: string;
  filters: SitecoreHarvestFiltersState;
  requestId: string;
  originTabId: number;
};
