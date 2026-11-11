import type { WorkClass } from "../../foundation/workers/work-scheduling.types";
import type { WorkerPoolStatus } from "../../foundation/workers/pool/pool.types";
import type { ACTIVITY } from "./activity.const";

export type ActivityState = "queued" | "started" | "completed" | "error" | "cancelled";

export type ActivityEvent = {
  activityId: string;
  kind: string;
  label: string;
  source: "worker" | "worker-pool" | "harvest" | "graph" | "enrichment" | "cache";
  state: ActivityState;
  timestamp: number;
  current?: number;
  detail?: string;
  poolStatus?: WorkerPoolStatus;
  requestId?: string;
  total?: number;
  workClass?: WorkClass;
};

export type ActivityFilter = { requestId?: string; workClass?: WorkClass };

export type ActivityListener = (event: ActivityEvent) => void;

export type ActivityMessage = { type: typeof ACTIVITY.MESSAGE_TYPE; activity: ActivityEvent };