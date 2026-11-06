import type { WorkerTask, WorkerTaskExecutionResult } from "../../../src/content/foundation/workers/tasks/worker-task.types.ts";
import type { WorkerTarget } from "../../../src/content/foundation/workers/pool/worker-target.ts";

export type Deferred<T> = { promise: Promise<T>; resolve: (value: T) => void; reject: (error: Error) => void };

export type WorkerCreation = { hostTabId: number; url: string; ready: Deferred<WorkerTarget> };

export type WorkerExecution = { target: WorkerTarget; task: WorkerTask; result: Deferred<WorkerTaskExecutionResult | undefined> };

export type PoolTestEnvironment = {
  creations: WorkerCreation[];
  executions: WorkerExecution[];
  closed: WorkerTarget[];
  maxWorkers: number;
  backgroundIntertaskCooldownMs: number;
  deferredCreation: boolean;
  create: (hostTabId: number, url: string) => Promise<WorkerTarget>;
  execute: (target: WorkerTarget, task: WorkerTask) => Promise<WorkerTaskExecutionResult | undefined>;
};