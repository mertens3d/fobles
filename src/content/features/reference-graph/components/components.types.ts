import type { SitecoreHarvestResult } from "../../../foundation/harvesting/harvesting.types";

export type GraphToolbarHandle = {
  showGraph: (graph: SitecoreHarvestResult, addCurrentGraphToHistory: boolean) => void;
};
