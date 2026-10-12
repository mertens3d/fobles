// @source-path [fobles] src/content/sitecore-harvester/harvest-steps.ts

import { collectReferrers } from "./collectors/referrer-collector";
import type { HarvestStep, ProgressStep } from "./sitecore-harvester.types";
import { collectSections } from "./collectors/section-collector/section-collector";
import { collectParent } from "./collectors/parent-collector";
import { collectChildren } from "./collectors/child-collector";
import { collectLayouts } from "./collectors/section-collector/layout-collector/layout-collector";

export const HARVEST_STEPS: readonly HarvestStep[] = [
  {
    stepKey: "children",
    filterKey: "children",
    label: "Children",
    build: collectChildren,
  },
  {
    stepKey: "sections",
    filterKey: "sections",
    label: "Sections",
    build: collectSections,
  },
  {
    stepKey: "layouts",
    filterKey: "layouts",
    label: "Layouts",
    build: collectLayouts,
  },
  {
    stepKey: "referrers",
    filterKey: "referrers",
    label: "Referrers",
    build: collectReferrers,
  },
  {
    stepKey: "parent",
    filterKey: "parent",
    label: "Parent",
    build: collectParent,
  },
];

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
    stepKey: "build-graph",
    label: "Building Graph",
  },
];