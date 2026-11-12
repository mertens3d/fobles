import type { SitecoreHarvestResult } from "../../../foundation/harvesting/sitecore-harvester.types";

export type GraphToolbarHandle = {
  showGraph: (graph: SitecoreHarvestResult, addCurrentGraphToHistory: boolean) => void;
};
