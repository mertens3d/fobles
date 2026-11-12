import type { SitecoreHarvestFiltersState } from "../../../../constants/_base/_base.types";
import type { WorkerTask, WorkerTaskType } from "../../workers/tasks/worker-task.types";

export type CollectorFilterKey = Exclude<keyof SitecoreHarvestFiltersState, "template">;

export type CollectorTaskType = Exclude<WorkerTaskType, "get-template-bases" | "get-quick-info" | "set-raw-values" | "set-standard-fields">;

export type CollectorTaskPlan = { normalTasks: WorkerTask[]; layoutTasks: WorkerTask[] };
