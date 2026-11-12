import type { SitecoreHarvestResult } from "../../../foundation/harvesting/sitecore-harvester.types";

export type RootRefreshListener = (result: SitecoreHarvestResult) => void;
