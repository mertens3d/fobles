import type { SitecoreHarvestResult } from "../../../foundation/harvesting/harvesting.types";

export type RootRefreshListener = (result: SitecoreHarvestResult) => void;
