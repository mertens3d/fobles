// @source-path [fobles] src/content/sitecore-harvester/harvest-steps.ts

import { collectLayout } from "./collectors/section-collector/layout-collector/layout-collector";
import { collectReferrers } from "./collectors/referrer-collector";
import type { HarvestStep, ProgressStep } from "./sitecore-harvester.types";
import { collectSections } from "./collectors/section-collector/section-collector";
import { collectControls } from "./collectors/section-collector/layout-collector/layout-harvest";
import { collectParent } from "./collectors/parent-collector";
import { collectChildren } from "./collectors/child-collector";

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
    stepKey: "layout",
    filterKey: "layout",
    label: "Layout",
    build: collectLayout,
  },
  {
    stepKey: "controls",
    filterKey: "controls",
    label: "Controls",
    build: collectControls,
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