import type { PoolWorker } from "../tasks/worker-task.types";


export type DestroyIdleWorker = (worker: PoolWorker, reason: string) => Promise<void>;
