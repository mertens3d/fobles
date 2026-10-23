// @source-path [fobles] src/content/sitecore-harvester/coordinator/harvest-result-merger.ts

import type { HarvestRequest, RootItem, SitecoreHarvestResult } from "../sitecore-harvester.types";
import type { WorkerTaskSuccessResult } from "../../sitecore-worker/tasks/worker-task.types";

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
    customFieldSections: undefined,
    standardFieldSections: undefined,
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
    case "get-quick-info":
      break;
    case "get-parent":
      target.parent = result.payload.parent;
      break;
    case "get-children":
      target.childItems = result.payload.childItems;
      break;
    case "get-referrers":
      target.referrers = result.payload.referrers;
      break;
    case "get-custom-fields":
      target.customFieldSections = result.payload.sections;
      break;
    case "get-standard-fields":
      target.standardFieldSections = result.payload.sections;
      break;
    case "get-layout":
      target.layoutSectionFields = result.payload.layoutSectionFields;
      break;
    case "set-raw-values":
      break;
    case "set-standard-fields":
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

  const quickInfoResult = results.find(
    (result): result is Extract<WorkerTaskSuccessResult, { type: "get-quick-info" }> =>
      result.type === "get-quick-info",
  );

  const value = quickInfoResult?.payload.result.status === "found"
    ? quickInfoResult.payload.result.value
    : undefined;

  return value?.scItemId ? { ...value, scItemId: value.scItemId } : undefined;
}
