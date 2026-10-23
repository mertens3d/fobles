// @source-path [fobles] src/content/sitecore-harvester/sitecore-harvester.types.ts

import type { HarvestSession } from "./harvest-session.types";

// Re-exported so existing harvester/reference-graph call sites can keep importing these pure
// item-data shapes from here unchanged - the canonical definitions now live in data-tree/, the
// one place both sitecore-worker and sitecore-harvester are allowed to depend on.
export {
  factoryItemGraphNodeData,
  type HarvestFieldLink,
  type ItemGraphNodeData,
  type LayoutDevice,
  type LayoutSectionField,
  type RootItem,
  type ScControl,
  type SitecoreHarvestField,
  type SitecoreHarvestSection,
} from "../data-tree/sitecore-item.types";
import type { ItemGraphNodeData, LayoutSectionField, RootItem, SitecoreHarvestSection } from "../data-tree/sitecore-item.types";

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
  filterKeys: readonly (keyof SitecoreHarvestFiltersState)[];
  label: string;
  build: (harvestContext: HarvestContext) => Promise<void>;
};

export function isHarvestStep(step: ProgressStep): step is HarvestStep {
  return "filterKeys" in step;
}

export type SitecoreHarvestResult = {
  rootItem: RootItem;
  parent: ItemGraphNodeData | undefined;
  layoutSectionFields: LayoutSectionField[] | undefined;
  customFieldSections: readonly SitecoreHarvestSection[] | undefined;
  standardFieldSections: readonly SitecoreHarvestSection[] | undefined;
  childItems: readonly ItemGraphNodeData[] | undefined;
  referrers: readonly ItemGraphNodeData[] | undefined;
};

export type SitecoreHarvestFiltersState = {
  parent: boolean;
  children: boolean;
  layouts: boolean;
  referrers: boolean;
  customFields: boolean;
  standardFields: boolean;
  template: boolean;
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
  session?: HarvestSession;
  existingResult?: SitecoreHarvestResult;
};
