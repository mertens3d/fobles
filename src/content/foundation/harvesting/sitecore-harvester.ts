// @source-path [fobles] src/content/foundation/harvesting/sitecore-harvester.ts

import type { HarvestStep, ProgressStep } from "./harvesting.types.js";

export function isHarvestStep(step: ProgressStep): step is HarvestStep {
  return "filterKeys" in step;
}