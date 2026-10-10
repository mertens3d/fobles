export type HarvestContext = {
  doc: Document;
  itemId: string;
  result: SitecoreHarvestResult;
  signal: AbortSignal;
  rootItem: itemNodeData;
};

export type HarvestStep = {
  harvestStepKey: HarvestStepKey;
  filterKey: keyof SitecoreHarvestFiltersState;
  label: string;
  build: (buildContext: HarvestContext) => Promise<void>;
};

export type itemNodeData = {
  name: string | undefined;
  itemId: string;
  link: string | undefined;
  path: string | undefined;
  templateLink: string | undefined;
  template: string | undefined;
};

export type SitecoreHarvestResult = {
  rootItem: itemNodeData;
  parent: itemNodeData | undefined;
  sharedLayoutName: string | undefined;
  sharedLayoutLink: string | undefined;
  sharedLayoutPath: string | undefined;
  controls: readonly HarvestGraphControl[] | undefined;
  sections: readonly SitecoreHarvestSection[] | undefined;
  childItems: readonly itemNodeData[] | undefined;
  referrers: readonly itemNodeData[] | undefined;
};
export type SitecoreHarvestFiltersState = {
  parent: boolean;
  children: boolean;
  layout: boolean;
  referrers: boolean;
  sections: boolean;
  template: boolean;
  controls: boolean;
};// One resolver per field-strategy, mirroring src/constants/_config.ts's per-strategy
// FoblesTopSelectors - but reading Sitecore's own raw markup directly (not the augmentor's
// injected buttons, which don't exist in a fetched/re-rooted document). Returns null when the
// marker isn't that strategy's shape at all, so collectSections' flat-text fallback still applies.

export type FieldLinkResolver = (marker: HTMLElement) => FieldLink[] | null;
export type FieldLink = {
  label: string;
  itemId: string;
};

export type SitecoreHarvestSection = {
  name: string;
  fields: readonly SitecoreHarvestField[];
};
export type HarvestGraphControl = {
  renderingId: string;
  name: string | undefined;
  path: string | undefined;
  template: string | undefined;
  datasource: string | undefined;
  datasourceLink: string | undefined;
  placeholder: string | undefined;
  uid: string | undefined;
  link: string | undefined;
  parameters: Record<string, string>;
};

export type SitecoreHarvestField = {
  label: string;
  value: string | undefined;
  // Set when a field-link strategy (xxxx.ts) recognized this field's raw
  // markup as a list of other items - e.g. treelist-ex's Insert options - so each one can render
  // as its own clickable node instead of being flattened into `value`.
  links?: readonly HarvestFieldLink[];
};
export type ParsedDevice = {
  layoutId: string | undefined;
  controls: HarvestGraphControl[];
};

export type HarvestFieldLink = {
  label: string;
  itemId: string;
};
export type HarvestStepKey = "children" | "sections" | "layout" | "controls" | "referrers" | "parent";

export type HarvestStatus = "skipped" | "complete";
export type HarvestProgressCallback = (step: HarvestStep, status: HarvestStatus) => void;

export type BackgroundHarvestContext = {
  url: string;
  filters: SitecoreHarvestFiltersState;
  requestId: string;
  originTabId: number;
};