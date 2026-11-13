import type { SitecoreHarvestFiltersState } from "../../../constants/_base/_base.types";
import type { StepKey } from "../../../constants/constants.types";
import type { ItemGraphNodeData, LayoutSectionField, RootItem, SitecoreHarvestSection } from "../reference-data/model/model.types";
import type { BooleanTripleState } from "../sitecore/macros/macros.types";

export type HarvestEditorState = { rawValues: BooleanTripleState; standardFields: BooleanTripleState };

export type HarvestSession = { requestId: string; originalEditorState: HarvestEditorState };

export type HarvestContext = {
  doc: Document;
  result: SitecoreHarvestResult;
  signal: AbortSignal;
  rootItem: ItemGraphNodeData;
};

export type ProgressStep = { stepKey: StepKey; label: string };

export type HarvestStep = ProgressStep & {
  stepKey: StepKey;
  filterKeys: readonly (keyof SitecoreHarvestFiltersState)[];
  label: string;
  build: (harvestContext: HarvestContext) => Promise<void>;
};

export type SitecoreHarvestResult = {
  rootItem: RootItem;
  parent: ItemGraphNodeData | undefined;
  layoutSectionFields: readonly LayoutSectionField[] | undefined;
  customFieldSections: readonly SitecoreHarvestSection[] | undefined;
  standardFieldSections: readonly SitecoreHarvestSection[] | undefined;
  childItems: readonly ItemGraphNodeData[] | undefined;
  referrers: readonly ItemGraphNodeData[] | undefined;
};

export type HarvestProgressStatus = "active" | "skipped" | "complete";

export type HarvestProgressCallback = (step: ProgressStep, status: HarvestProgressStatus) => void;

export type HarvestRequest = {
  requestId: string;
  url: string;
  filters: SitecoreHarvestFiltersState;
  session?: HarvestSession;
  existingResult?: SitecoreHarvestResult;
};
