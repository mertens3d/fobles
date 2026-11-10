import type { WorkerTask, WorkerTaskExecutionResult } from "../tasks/worker-task.types";


export type ExecuteWorkerTask = (
  doc: Document,
  task: WorkerTask,
  signal: AbortSignal
) => Promise<WorkerTaskExecutionResult>;

export type IsWorkerDocumentReady = (doc: Document) => boolean;
