// @source-path [fobles] src/content/sitecore-harvester/background-tab/sitecore-harvester.messages.ts

import type {
  HarvestProgressStatus,
  StepKey,
  SitecoreHarvestFiltersState,
} from "../sitecore-harvester.types";
import { REFERENCE_GRAPH } from "../../../constants/graph.const";

export type SitecoreHarvestProgressMessage = {
  type: typeof REFERENCE_GRAPH.BACKGROUND_HARVEST.MESSAGE.TYPE.SITECORE_HARVEST_PROGRESS;
  requestId: string;
  originTabId: number;
  stepKey: StepKey;
  label: string;
  status: HarvestProgressStatus;
};

export type HarvestSitecoreMessage = {
  type: typeof  REFERENCE_GRAPH.BACKGROUND_HARVEST.MESSAGE.TYPE.HARVEST_SITECORE;
  requestId: string;
  originTabId: number;
  filters: SitecoreHarvestFiltersState;
};

export type HarvestSitecoreInBackgroundTabMessage = {
  type: typeof  REFERENCE_GRAPH.BACKGROUND_HARVEST.MESSAGE.TYPE.HARVEST_SITECORE_IN_BACKGROUND_TAB;
  requestId: string;
  url: string;
  filters: SitecoreHarvestFiltersState;
};

