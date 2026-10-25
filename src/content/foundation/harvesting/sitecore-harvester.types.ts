// @source-path [fobles] src/content/foundation/harvesting/sitecore-harvester.types.ts

import type { ItemGraphNodeData, LayoutSectionField, RootItem, SitecoreHarvestSection } from "../../features/reference-model/sitecore-item.types";
import type { HarvestSession } from "./harvest-session.types";

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
  layoutSectionFields: readonly LayoutSectionField[] | undefined;
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
