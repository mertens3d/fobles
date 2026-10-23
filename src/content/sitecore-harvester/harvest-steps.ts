// @source-path [fobles] src/content/sitecore-harvester/harvest-steps.ts

import { collectReferrers } from "./collectors/referrer-collector";
import type { HarvestStep, ProgressStep } from "./sitecore-harvester.types";
import { collectSections } from "./collectors/section-collector/section-collector";
import { collectParent } from "./collectors/parent-collector";
import { collectChildren } from "./collectors/child-collector";
import { collectLayouts } from "./collectors/section-collector/layout-collector/layout-collector";
import type { WorkerTaskType } from "./worker-pool/worker-task.types";

export const HARVEST_STEPS: readonly HarvestStep[] = [
  {
    stepKey: "children",
    filterKeys: ["children"],
    label: "Children",
    build: collectChildren,
  },
  {
    stepKey: "sections",
    filterKeys: ["customFields", "standardFields"],
    label: "Custom Fields",
    build: collectSections,
  },
  {
    stepKey: "layouts",
    filterKeys: ["layouts"],
    label: "Layouts",
    build: collectLayouts,
  },
  {
    stepKey: "referrers",
    filterKeys: ["referrers"],
    label: "Referrers",
    build: collectReferrers,
  },
  {
    stepKey: "parent",
    filterKeys: ["parent"],
    label: "Parent",
    build: collectParent,
  }

];

// One entry per collector task type, used to find the matching progress step directly -
// collect-sections is gated by two filter keys (fields, standardFields), so it can't be
// recovered from a single filter key alone.
export const HARVEST_STEP_BY_TASK_TYPE: ReadonlyMap<WorkerTaskType, HarvestStep> = new Map([
  ["collect-children", HARVEST_STEPS[0]],
  ["collect-sections", HARVEST_STEPS[1]],
  ["collect-layouts", HARVEST_STEPS[2]],
  ["collect-referrers", HARVEST_STEPS[3]],
  ["collect-parent", HARVEST_STEPS[4]],
]);

export const PROGRESS_STEPS: readonly ProgressStep[] = [
  {
    stepKey: "fetch-document",
    label: "Fetching Document",
  },
  {
    stepKey: "parse-document",
    label: "Parsing Document",
  },
  {
    stepKey: "root-item",
    label: "Root Item",
  },
  ...HARVEST_STEPS,
  {
    stepKey: "enrichment",
    label: "Enriching Items",
  },
  {
    stepKey: "build-graph",
    label: "Building Graph",
  },

];