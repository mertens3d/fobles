import type { WorkerTask, WorkerTaskResult } from "../../../src/content/foundation/workers/tasks/worker-task.types.ts";

export type SessionTestEnvironment = {
  cancelled: string[];
  cleanupCount: number;
  disposalCount: number;
  tasks: WorkerTask[];
  pending?: Promise<WorkerTaskResult | undefined>;
};