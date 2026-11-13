import type { SitecoreHarvestFiltersState } from "../../../../constants/_base/_base.types";
import type { WorkerTask } from "../../workers/tasks/tasks.types";
import type { WorkerTaskType } from "../../workers/tasks/tasks.types";

export type CollectorFilterKey = Exclude<keyof SitecoreHarvestFiltersState, "template">;

export type CollectorTaskType = Exclude<WorkerTaskType, "get-template-bases" | "get-quick-info" | "set-raw-values" | "set-standard-fields">;

export type CollectorTaskPlan = { normalTasks: WorkerTask[]; layoutTasks: WorkerTask[] };
