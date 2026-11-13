import type { CollectorFilterKey, CollectorTaskType } from "./planner.types.js";

// customFields and standardFields are two independent harvest crops, each read via its own
// atomic operation (both still happen to re-scan the same section DOM - see worker-task-executor).
export const COLLECTOR_TASK_TYPE_BY_FILTER_KEY: Readonly<Record<CollectorFilterKey, CollectorTaskType>> = {
  parent: "get-parent",
  children: "get-children",
  referrers: "get-referrers",
  customFields: "get-custom-fields",
  standardFields: "get-standard-fields",
  layouts: "get-layout",
};
