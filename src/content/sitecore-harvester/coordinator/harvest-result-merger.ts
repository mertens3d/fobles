// @source-path [fobles] src/content/sitecore-harvester/coordinator/harvest-result-merger.ts

import type { HarvestRequest, RootItem, SitecoreHarvestResult } from "../sitecore-harvester.types";
import type { WorkerTaskSuccessResult } from "../worker-pool/worker-task.types";

// Starting point for the accumulating result: when existingResult is supplied, previously
// harvested data for filters that were NOT requested this time must survive untouched - cloning
// existingResult (then swapping in the freshly-resolved rootItem) gives exactly that, with no
// separate "merge the old and new graphs together" pass needed afterward.
export function createBaseResult(request: HarvestRequest, rootItem: RootItem): SitecoreHarvestResult {
  if (request.existingResult) {
    return { ...request.existingResult, rootItem };
  }

  return {
    rootItem,
    parent: undefined,
    layoutSectionFields: undefined,
    sections: undefined,
    childItems: undefined,
    referrers: undefined,
  };
}

// Mirrors harvest-task-planner's filter-key -> task-type mapping, one switch case per collector
// task type, each assigning only its own field - never touching fields other collectors own.
export function mergeCollectorResult(
  target: SitecoreHarvestResult,
  result: WorkerTaskSuccessResult,
): void {
  switch (result.type) {
    case "collect-root-item":
      break;
    case "collect-parent":
      target.parent = result.payload.parent;
      break;
    case "collect-children":
      target.childItems = result.payload.childItems;
      break;
    case "collect-referrers":
      target.referrers = result.payload.referrers;
      break;
    case "collect-sections":
      target.sections = result.payload.sections;
      break;
    case "collect-layouts":
      target.layoutSectionFields = result.payload.layoutSectionFields;
      break;
    case "enrich-item":
      break;
  }
}

export function extractRootItem(
  request: HarvestRequest,
  results: readonly WorkerTaskSuccessResult[],
): RootItem | undefined {
  if (request.existingResult) {
    return request.existingResult.rootItem;
  }

  const rootItemResult = results.find(
    (result): result is Extract<WorkerTaskSuccessResult, { type: "collect-root-item" }> =>
      result.type === "collect-root-item",
  );

  return rootItemResult?.payload.rootItem;
}
