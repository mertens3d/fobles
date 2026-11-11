import type { WorkerTarget } from "./pool.types.js";
import type { WorkerTabTarget } from "./pool.types.js";
// @source-path [fobles] src/content/foundation/workers/pool/worker-target.ts

import type { WorkerIframeTarget } from "../iframe/iframe.types";

export function isWorkerTabTarget(target: WorkerTarget): target is WorkerTabTarget {
  return target.kind === "tab";
}

export function isWorkerIframeTarget(target: WorkerTarget): target is WorkerIframeTarget {
  return target.kind === "iframe";
}
