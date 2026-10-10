import type {
  HarvestStatus,
  HarvestStepKey,
  SitecoreHarvestFiltersState,
} from "./sitecore-harvester.types";

export type SitecoreHarvestProgressMessage = {
  type: "SITECORE_HARVEST_PROGRESS";
  requestId: string;
  originTabId: number;
  harvestStepKey: HarvestStepKey;
  label: string;
  status: HarvestStatus;
};

export type HarvestSitecoreMessage = {
  type: "HARVEST_SITECORE";
  requestId: string;
  originTabId: number;
  filters: SitecoreHarvestFiltersState;
};

export type HarvestSitecoreInBackgroundTabMessage = {
  type: "HARVEST_SITECORE_IN_BACKGROUND_TAB";
  requestId: string;
  url: string;
  filters: SitecoreHarvestFiltersState;
};